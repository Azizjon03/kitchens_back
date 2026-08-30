<?php

namespace Tests\Feature;

use App\Contracts\PasswordResetNotifier;
use App\Models\Company;
use App\Models\PasswordResetCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    private const PHONE = '+998901112233';

    private function company(string $slug, bool $active = true): Company
    {
        return Company::create([
            'name' => ucfirst($slug),
            'slug' => $slug,
            'phone' => '+99890000'.substr(md5($slug), 0, 4),
            'is_active' => $active,
        ]);
    }

    private function user(Company $company, string $phone, string $password, array $overrides = []): User
    {
        return User::create(array_merge([
            'company_id' => $company->id,
            'name' => 'Staff '.$company->slug,
            'phone' => $phone,
            'role' => 'company_admin',
            'password' => $password,
            'is_active' => true,
        ], $overrides));
    }

    /** @return array<string, string> */
    private function bearer(User $user): array
    {
        return ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];
    }

    /**
     * Laravel resolves the auth guard once per application instance, and a
     * feature test reuses one instance across every request it makes — so the
     * guard would keep serving the user it authenticated the first time.
     * Production builds a fresh container per request; drop the guard here so
     * the next call genuinely re-validates the bearer token.
     */
    private function forgetGuards(): void
    {
        $this->app['auth']->forgetGuards();
    }

    private function recordingNotifier(): RecordingPasswordResetNotifier
    {
        $notifier = new RecordingPasswordResetNotifier;
        $this->app->instance(PasswordResetNotifier::class, $notifier);

        return $notifier;
    }

    // ---------------------------------------------------------------------
    // Login across tenants
    // ---------------------------------------------------------------------

    public function test_same_phone_in_two_companies_each_logs_into_its_own_company(): void
    {
        $alpha = $this->company('alpha');
        $beta = $this->company('beta');

        $alphaUser = $this->user($alpha, self::PHONE, 'alpha-secret-1');
        $betaUser = $this->user($beta, self::PHONE, 'beta-secret-2');

        // The beta user has the higher id, so a naive ->first() could never reach it.
        $this->assertTrue($betaUser->id > $alphaUser->id);

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'alpha-secret-1'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $alphaUser->id)
            ->assertJsonPath('data.user.company_id', $alpha->id);

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'beta-secret-2'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $betaUser->id)
            ->assertJsonPath('data.user.company_id', $beta->id);
    }

    public function test_login_accepts_an_unnormalized_phone(): void
    {
        $alpha = $this->company('alpha');
        $user = $this->user($alpha, self::PHONE, 'alpha-secret-1');

        $this->postJson('/api/v1/auth/login', ['phone' => '+998 90 111 22 33', 'password' => 'alpha-secret-1'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id);
    }

    public function test_login_rejects_a_wrong_password(): void
    {
        $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1');

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'wrong-password'])
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_login_rejects_an_unknown_phone_with_the_same_error(): void
    {
        $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1');

        $this->postJson('/api/v1/auth/login', ['phone' => '+998909998877', 'password' => 'alpha-secret-1'])
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_login_refuses_to_guess_when_phone_and_password_are_shared(): void
    {
        $this->user($this->company('alpha'), self::PHONE, 'shared-secret-1');
        $this->user($this->company('beta'), self::PHONE, 'shared-secret-1');

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'shared-secret-1'])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'AMBIGUOUS_CREDENTIALS');
    }

    public function test_a_shared_password_resolves_to_the_only_active_company(): void
    {
        $this->user($this->company('alpha', active: false), self::PHONE, 'shared-secret-1');
        $betaUser = $this->user($this->company('beta'), self::PHONE, 'shared-secret-1');

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'shared-secret-1'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $betaUser->id);
    }

    public function test_login_rejects_a_deactivated_account(): void
    {
        $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1', ['is_active' => false]);

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'alpha-secret-1'])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'ACCOUNT_DISABLED');
    }

    // ---------------------------------------------------------------------
    // Token lifecycle
    // ---------------------------------------------------------------------

    public function test_an_existing_token_stops_working_once_the_user_is_deactivated(): void
    {
        $user = $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1');
        $headers = $this->bearer($user);

        $this->withHeaders($headers)->getJson('/api/v1/auth/me')->assertOk();

        $user->update(['is_active' => false]);
        $this->forgetGuards();

        $this->withHeaders($headers)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_sanctum_tokens_have_a_configured_expiration(): void
    {
        $this->assertGreaterThan(0, (int) config('sanctum.expiration'));

        $user = $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1');
        $headers = $this->bearer($user);

        $this->withHeaders($headers)->getJson('/api/v1/auth/me')->assertOk();

        $this->travel((int) config('sanctum.expiration') + 1)->minutes();
        $this->forgetGuards();

        $this->withHeaders($headers)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    // ---------------------------------------------------------------------
    // Password reset
    // ---------------------------------------------------------------------

    public function test_password_reset_works_end_to_end(): void
    {
        $notifier = $this->recordingNotifier();
        $user = $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();

        $this->assertCount(1, $notifier->sent);
        $token = $notifier->sent[0]['token'];

        $this->postJson('/api/v1/auth/reset-password', [
            'phone' => self::PHONE,
            'token' => $token,
            'password' => 'brand-new-secret-9',
            'password_confirmation' => 'brand-new-secret-9',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'brand-new-secret-9'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id);

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'old-secret-1'])
            ->assertStatus(401);
    }

    public function test_the_reset_code_is_never_stored_in_plaintext(): void
    {
        $notifier = $this->recordingNotifier();
        $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();

        $token = $notifier->sent[0]['token'];
        $row = DB::table('password_reset_codes')->first();

        $this->assertNotNull($row);
        $this->assertNotSame($token, $row->token_hash);
        $this->assertSame(64, strlen($row->token_hash));
        $this->assertStringNotContainsString($token, json_encode((array) $row));
    }

    public function test_a_used_reset_code_cannot_be_replayed(): void
    {
        $notifier = $this->recordingNotifier();
        $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();
        $token = $notifier->sent[0]['token'];

        $payload = [
            'phone' => self::PHONE,
            'token' => $token,
            'password' => 'brand-new-secret-9',
            'password_confirmation' => 'brand-new-secret-9',
        ];

        $this->postJson('/api/v1/auth/reset-password', $payload)->assertOk();

        $this->postJson('/api/v1/auth/reset-password', array_merge($payload, [
            'password' => 'second-attempt-9',
            'password_confirmation' => 'second-attempt-9',
        ]))->assertStatus(422)->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');

        // The second attempt changed nothing.
        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'brand-new-secret-9'])
            ->assertOk();
        $this->assertSame(0, PasswordResetCode::count());
    }

    public function test_an_expired_reset_code_is_rejected(): void
    {
        $notifier = $this->recordingNotifier();
        $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();
        $token = $notifier->sent[0]['token'];

        // 15-minute TTL — jump past it.
        $this->travel(16)->minutes();

        $this->postJson('/api/v1/auth/reset-password', [
            'phone' => self::PHONE,
            'token' => $token,
            'password' => 'brand-new-secret-9',
            'password_confirmation' => 'brand-new-secret-9',
        ])->assertStatus(422)->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'old-secret-1'])
            ->assertOk();
    }

    public function test_a_wrong_reset_code_is_rejected(): void
    {
        $notifier = $this->recordingNotifier();
        $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();
        $wrong = $notifier->sent[0]['token'] === '000000' ? '111111' : '000000';

        $this->postJson('/api/v1/auth/reset-password', [
            'phone' => self::PHONE,
            'token' => $wrong,
            'password' => 'brand-new-secret-9',
            'password_confirmation' => 'brand-new-secret-9',
        ])->assertStatus(422)->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');
    }

    public function test_forgot_password_does_not_reveal_whether_the_phone_exists(): void
    {
        config(['app.debug' => false]);
        $this->recordingNotifier();
        $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        $known = $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE]);
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['phone' => '+998909998877']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json(), $unknown->json());

        // ...and nothing was issued for the unknown number.
        $this->assertSame(1, PasswordResetCode::count());
    }

    public function test_a_reset_for_one_tenant_leaves_the_other_tenants_password_alone(): void
    {
        $notifier = $this->recordingNotifier();
        $alphaUser = $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1');
        $this->user($this->company('beta'), self::PHONE, 'beta-secret-2');

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();

        // One code per matching account — the code, not the phone, picks the user.
        $this->assertCount(2, $notifier->sent);
        $alphaToken = collect($notifier->sent)->firstWhere('user_id', $alphaUser->id)['token'];

        $this->postJson('/api/v1/auth/reset-password', [
            'phone' => self::PHONE,
            'token' => $alphaToken,
            'password' => 'brand-new-secret-9',
            'password_confirmation' => 'brand-new-secret-9',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'brand-new-secret-9'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $alphaUser->id);

        $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => 'beta-secret-2'])
            ->assertOk();
    }

    public function test_reset_revokes_the_existing_tokens(): void
    {
        $notifier = $this->recordingNotifier();
        $user = $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');
        $headers = $this->bearer($user);

        $this->withHeaders($headers)->getJson('/api/v1/auth/me')->assertOk();

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();

        $this->postJson('/api/v1/auth/reset-password', [
            'phone' => self::PHONE,
            'token' => $notifier->sent[0]['token'],
            'password' => 'brand-new-secret-9',
            'password_confirmation' => 'brand-new-secret-9',
        ])->assertOk();

        $this->forgetGuards();

        $this->withHeaders($headers)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_reset_requests_are_rate_limited(): void
    {
        $this->recordingNotifier();
        $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])->assertOk();
        }

        $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE])
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'TOO_MANY_REQUESTS');
    }

    public function test_debug_mode_returns_the_token_but_only_in_debug_mode(): void
    {
        $this->recordingNotifier();
        $user = $this->user($this->company('alpha'), self::PHONE, 'old-secret-1');

        config(['app.debug' => true]);
        $debug = $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE]);
        $debug->assertOk()->assertJsonPath('data.debug_tokens.0.user_id', $user->id);

        config(['app.debug' => false]);
        $prod = $this->postJson('/api/v1/auth/forgot-password', ['phone' => self::PHONE]);
        $prod->assertOk();
        $this->assertArrayNotHasKey('debug_tokens', $prod->json('data'));
    }

    // ---------------------------------------------------------------------
    // Profile phone uniqueness
    // ---------------------------------------------------------------------

    public function test_profile_phone_cannot_collide_inside_the_same_company(): void
    {
        $alpha = $this->company('alpha');
        $user = $this->user($alpha, self::PHONE, 'alpha-secret-1');
        $colleague = $this->user($alpha, '+998904445566', 'alpha-secret-2', ['role' => 'waiter']);

        $this->withHeaders($this->bearer($user))
            ->putJson('/api/v1/auth/me', ['phone' => $colleague->phone])
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');

        $this->assertSame(self::PHONE, $user->fresh()->phone);
    }

    public function test_profile_phone_collision_is_detected_after_normalization(): void
    {
        $alpha = $this->company('alpha');
        $user = $this->user($alpha, self::PHONE, 'alpha-secret-1');
        $this->user($alpha, '+998904445566', 'alpha-secret-2', ['role' => 'waiter']);

        $this->withHeaders($this->bearer($user))
            ->putJson('/api/v1/auth/me', ['phone' => '+998 90 444 55 66'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_profile_phone_may_match_a_user_in_another_company(): void
    {
        $user = $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1');
        $this->user($this->company('beta'), '+998904445566', 'beta-secret-2');

        $this->withHeaders($this->bearer($user))
            ->putJson('/api/v1/auth/me', ['phone' => '+998 90 444 55 66'])
            ->assertOk();

        $this->assertSame('+998904445566', $user->fresh()->phone);
    }

    public function test_profile_phone_is_stored_normalized(): void
    {
        $user = $this->user($this->company('alpha'), self::PHONE, 'alpha-secret-1');

        $this->withHeaders($this->bearer($user))
            ->putJson('/api/v1/auth/me', ['phone' => '+998 (90) 777-88-99'])
            ->assertOk();

        $this->assertSame('+998907778899', $user->fresh()->phone);
    }
}

/**
 * Captures issued reset codes instead of delivering them, which is also the
 * proof that the delivery seam is a single swappable binding.
 */
class RecordingPasswordResetNotifier implements PasswordResetNotifier
{
    /** @var array<int, array{user_id: int, token: string, expires_at: Carbon}> */
    public array $sent = [];

    public function send(User $user, string $token, Carbon $expiresAt): void
    {
        $this->sent[] = [
            'user_id' => $user->id,
            'token' => $token,
            'expires_at' => $expiresAt,
        ];
    }
}
