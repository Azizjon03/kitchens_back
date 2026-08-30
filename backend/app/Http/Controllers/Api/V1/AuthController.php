<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\PasswordResetNotifier;
use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PasswordResetCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    use ApiResponse;

    /** How long an issued reset code stays usable. */
    private const RESET_TTL_MINUTES = 15;

    /** Wrong-code guesses tolerated per issued code before it is burned. */
    private const RESET_MAX_ATTEMPTS = 5;

    /** Reset requests allowed per phone / per IP, per hour. */
    private const RESET_REQUESTS_PER_PHONE = 5;

    private const RESET_REQUESTS_PER_IP = 20;

    /** Reset confirmations allowed per phone / per IP, per hour. */
    private const RESET_CONFIRMS_PER_PHONE = 10;

    private const RESET_CONFIRMS_PER_IP = 40;

    private const RESET_THROTTLE_SECONDS = 3600;

    /**
     * A valid bcrypt digest of a value nobody knows. Used only so that a login
     * attempt for a phone that does not exist still pays for one hash
     * comparison, keeping its response time comparable to a real attempt.
     */
    private const DUMMY_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
        ]);

        $phone = User::normalizePhone((string) $request->input('phone'));
        $password = (string) $request->input('password');

        // `users` is unique on (company_id, phone), NOT on phone alone: the same
        // number may legitimately belong to staff in several companies. Test the
        // password against every candidate instead of blindly taking the first.
        $candidates = User::with('company')->where('phone', $phone)->get();

        $matches = $candidates
            ->filter(fn (User $candidate) => Hash::check($password, $candidate->password))
            ->values();

        if ($candidates->isEmpty()) {
            // No candidate was hashed above — burn one comparison anyway.
            Hash::check($password, self::DUMMY_PASSWORD_HASH);
        }

        if ($matches->isEmpty()) {
            // Same message whether the phone or the password was wrong.
            return $this->error('INVALID_CREDENTIALS', 'Telefon raqam yoki parol noto\'g\'ri.', 401);
        }

        $user = $this->resolveLoginCandidate($matches);

        if ($user === null) {
            return $this->error(
                'AMBIGUOUS_CREDENTIALS',
                'Bu telefon raqam va parol bir nechta kompaniyaga mos keldi. Administratoringizga murojaat qiling.',
                409
            );
        }

        if (! $user->is_active) {
            return $this->error('ACCOUNT_DISABLED', 'Your account has been deactivated.', 403);
        }

        $this->pruneExpiredTokens($user);

        $token = $user->createToken('auth')->plainTextToken;

        return $this->success([
            'user' => $user->load('company', 'branch'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success($request->user()->load('company', 'branch'));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        // Normalize before validating, otherwise "+998 90 123 45 67" would slip
        // past the uniqueness rule and then collide at the DB index.
        if ($request->has('phone') && is_string($request->input('phone'))) {
            $request->merge(['phone' => User::normalizePhone($request->input('phone'))]);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => [
                'sometimes', 'string', 'max:20', 'regex:/^\+[0-9]{9,15}$/',
                // Scoped to the company, mirroring users.unique(company_id, phone).
                // Soft-deleted rows are deliberately included: the DB index counts
                // them too, so excluding them here would just turn 422 into a 500.
                Rule::unique('users', 'phone')
                    ->where(fn ($query) => $user->company_id === null
                        ? $query->whereNull('company_id')
                        : $query->where('company_id', $user->company_id))
                    ->ignore($user->id),
            ],
            'email' => 'sometimes|nullable|email|max:255',
            'avatar' => 'sometimes|nullable|string|max:500',
        ]);

        $user->update($data);

        return $this->success($user->fresh()->load('company', 'branch'));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        if (! Hash::check($request->current_password, $request->user()->password)) {
            return $this->error('WRONG_PASSWORD', 'Current password is incorrect.', 422);
        }

        $request->user()->update(['password' => $request->password]);

        return $this->success(null);
    }

    /**
     * Issue a reset code for every active account on the given phone.
     *
     * One code per matching user: the phone alone cannot identify an account
     * across tenants, so the code is what resolves it at confirmation time.
     */
    public function forgotPassword(Request $request, PasswordResetNotifier $notifier): JsonResponse
    {
        $request->validate(['phone' => 'required|string|max:20']);

        $phone = User::normalizePhone((string) $request->input('phone'));

        $throttled = ! $this->hitRateLimits([
            'pw-reset-req:'.sha1($phone) => self::RESET_REQUESTS_PER_PHONE,
            'pw-reset-req-ip:'.sha1((string) $request->ip()) => self::RESET_REQUESTS_PER_IP,
        ]);

        if ($throttled) {
            return $this->error('TOO_MANY_REQUESTS', 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring.', 429);
        }

        $payload = ['message' => 'Agar bu raqam tizimda mavjud bo\'lsa, tiklash kodi yuborildi.'];

        $expiresAt = now()->addMinutes(self::RESET_TTL_MINUTES);
        $issued = [];

        $users = User::where('phone', $phone)->where('is_active', true)->get();

        foreach ($users as $user) {
            // Only the newest code per user stays valid.
            PasswordResetCode::where('user_id', $user->id)->delete();

            $token = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            PasswordResetCode::create([
                'user_id' => $user->id,
                'phone' => $phone,
                'token_hash' => $this->hashResetToken($user->id, $token),
                'expires_at' => $expiresAt,
            ]);

            $notifier->send($user, $token, $expiresAt);

            $issued[] = [
                'user_id' => $user->id,
                'company_id' => $user->company_id,
                'token' => $token,
            ];
        }

        // Dev convenience only. Never reachable with APP_DEBUG=false.
        if (config('app.debug')) {
            $payload['debug_tokens'] = $issued;
        }

        // Identical response for unknown numbers — no user enumeration.
        return $this->success($payload);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|max:20',
            'token' => 'required|string|max:64',
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $phone = User::normalizePhone((string) $request->input('phone'));
        $phoneKey = 'pw-reset-confirm:'.sha1($phone);

        $throttled = ! $this->hitRateLimits([
            $phoneKey => self::RESET_CONFIRMS_PER_PHONE,
            'pw-reset-confirm-ip:'.sha1((string) $request->ip()) => self::RESET_CONFIRMS_PER_IP,
        ]);

        if ($throttled) {
            return $this->error('TOO_MANY_REQUESTS', 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring.', 429);
        }

        PasswordResetCode::where('expires_at', '<=', now())->delete();

        $matched = $this->matchResetCode($phone, (string) $request->input('token'));

        if ($matched === null) {
            return $this->error('INVALID_RESET_TOKEN', 'Tiklash kodi noto\'g\'ri yoki muddati tugagan.', 422);
        }

        $user = $matched->user;

        if (! $user || ! $user->is_active) {
            $matched->delete();

            return $this->error('INVALID_RESET_TOKEN', 'Tiklash kodi noto\'g\'ri yoki muddati tugagan.', 422);
        }

        // The `hashed` cast on User::$password does the hashing.
        $user->update(['password' => (string) $request->input('password')]);

        // Single use, and every existing session dies with the old password.
        PasswordResetCode::where('user_id', $user->id)->delete();
        $user->tokens()->delete();

        RateLimiter::clear($phoneKey);

        return $this->success(['message' => 'Parol yangilandi.']);
    }

    /**
     * Pick the single account a login belongs to, or null when it is ambiguous.
     *
     * @param  Collection<int, User>  $matches
     */
    private function resolveLoginCandidate(Collection $matches): ?User
    {
        if ($matches->count() === 1) {
            return $matches->first();
        }

        // More than one account shares this phone AND this password. Prefer the
        // one that could actually be used; stay ambiguous if that is still
        // more than one, rather than silently signing into the wrong tenant.
        $usable = $matches
            ->filter(fn (User $user) => $user->is_active
                && ($user->company === null || $user->company->is_active))
            ->values();

        return $usable->count() === 1 ? $usable->first() : null;
    }

    /**
     * Find the reset code matching the submitted plaintext, burning attempts.
     */
    private function matchResetCode(string $phone, string $token): ?PasswordResetCode
    {
        $codes = PasswordResetCode::where('phone', $phone)
            ->where('expires_at', '>', now())
            ->get();

        foreach ($codes as $code) {
            $code->increment('attempts');

            if ($code->attempts > self::RESET_MAX_ATTEMPTS) {
                $code->delete();

                continue;
            }

            if (hash_equals($code->token_hash, $this->hashResetToken($code->user_id, $token))) {
                return $code;
            }
        }

        return null;
    }

    /**
     * Keyed by the app key so a leaked DB dump alone cannot replay codes, and
     * salted with the user id so identical codes hash differently per user.
     */
    private function hashResetToken(int $userId, string $token): string
    {
        return hash_hmac('sha256', $userId.':'.$token, (string) config('app.key'));
    }

    /**
     * Check every limiter first, then record a hit on all of them.
     *
     * @param  array<string, int>  $limits  limiter key => max attempts per window
     * @return bool false when any limit is already exhausted
     */
    private function hitRateLimits(array $limits): bool
    {
        foreach ($limits as $key => $max) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                return false;
            }
        }

        foreach (array_keys($limits) as $key) {
            RateLimiter::hit($key, self::RESET_THROTTLE_SECONDS);
        }

        return true;
    }

    /**
     * Housekeeping: drop this user's tokens that the Sanctum expiration window
     * has already invalidated. Tokens on other devices are intentionally kept —
     * a POS terminal and a phone are commonly signed in at the same time.
     */
    private function pruneExpiredTokens(User $user): void
    {
        $ttl = (int) config('sanctum.expiration');

        if ($ttl > 0) {
            $user->tokens()->where('created_at', '<=', now()->subMinutes($ttl))->delete();
        }
    }
}
