<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    use ApiResponse;

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
        ]);

        $phone = preg_replace('/\D/', '', $request->phone);
        $phone = '+' . $phone;

        $user = User::where('phone', $phone)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return $this->error('INVALID_CREDENTIALS', 'Telefon raqam yoki parol noto\'g\'ri.', 401);
        }

        if (! $user->is_active) {
            return $this->error('ACCOUNT_DISABLED', 'Your account has been deactivated.', 403);
        }

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
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'email' => 'sometimes|nullable|email|max:255',
            'avatar' => 'sometimes|nullable|string|max:500',
        ]);

        $request->user()->update($data);

        return $this->success($request->user()->fresh()->load('company', 'branch'));
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

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            // Return success anyway to prevent email enumeration
            return $this->success(['message' => 'If the email exists, a reset code has been sent.']);
        }

        $token = Str::random(64);

        // For now, just log the reset token
        Log::info("Password reset requested for {$user->email}. Token: {$token}");

        return $this->success(['message' => 'If the email exists, a reset code has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'token', 'password', 'password_confirmation'),
            function (User $user, string $password) {
                $user->update(['password' => $password]);
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return $this->error('RESET_FAILED', __($status), 422);
        }

        return $this->success(['message' => 'Password has been reset.']);
    }
}
