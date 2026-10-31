<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

/**
 * Bitta telefon bir nechta restoranda (#10): parol bir xil bo'lsa, login
 * restoran tanlashni so'raydi, tanlangan akkaunt uchun token beriladi.
 */
class MultiCompanyLoginTest extends TestCase
{
    use RefreshDatabase;

    private const PHONE = '+998901112233';

    private function account(string $slug, string $role = 'company_admin', string $password = 'secret123', bool $companyActive = true): User
    {
        $company = Company::create(['name' => 'Restoran '.$slug, 'slug' => $slug, 'phone' => '+998700000000', 'is_active' => $companyActive]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Markaziy', 'is_active' => true]);

        return User::create([
            'company_id' => $company->id, 'branch_id' => $role === 'company_admin' ? null : $branch->id,
            'name' => 'Ali', 'phone' => self::PHONE, 'role' => $role, 'password' => $password, 'is_active' => true,
        ]);
    }

    private function login(string $password = 'secret123')
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/v1/auth/login', ['phone' => self::PHONE, 'password' => $password]);
    }

    public function test_same_phone_and_password_in_two_companies_asks_to_choose(): void
    {
        $a = $this->account('a');
        $b = $this->account('b', 'waiter');

        $res = $this->login()->assertOk()
            ->assertJsonPath('data.requires_company_selection', true)
            ->assertJsonMissingPath('data.token')
            ->assertJsonCount(2, 'data.accounts');

        $accounts = collect($res->json('data.accounts'));
        $this->assertEqualsCanonicalizing([$a->id, $b->id], $accounts->pluck('user_id')->all());
        $this->assertSame('Restoran b', $accounts->firstWhere('user_id', $b->id)['company']['name']);
        $this->assertSame('waiter', $accounts->firstWhere('user_id', $b->id)['role']);
        $this->assertNotEmpty($res->json('data.selection_token'));
    }

    public function test_selecting_an_account_returns_a_token_for_that_company(): void
    {
        $this->account('a');
        $b = $this->account('b', 'waiter');
        $selection = $this->login()->json('data.selection_token');

        $this->app['auth']->forgetGuards();
        $res = $this->postJson('/api/v1/auth/login/select', ['selection_token' => $selection, 'user_id' => $b->id])
            ->assertOk()
            ->assertJsonPath('data.user.id', $b->id)
            ->assertJsonPath('data.user.company_id', $b->company_id);

        $this->app['auth']->forgetGuards();
        $this->withToken($res->json('data.token'))->getJson('/api/v1/auth/me')
            ->assertOk()->assertJsonPath('data.id', $b->id);
    }

    public function test_cannot_select_an_account_outside_the_token(): void
    {
        $this->account('a');
        $this->account('b');
        $other = User::create([
            'company_id' => null, 'name' => 'Super', 'phone' => '+998906921469',
            'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true,
        ]);
        $selection = $this->login()->json('data.selection_token');

        $this->postJson('/api/v1/auth/login/select', ['selection_token' => $selection, 'user_id' => $other->id])
            ->assertStatus(422)->assertJsonPath('error.code', 'INVALID_SELECTION');
    }

    public function test_tampered_or_expired_selection_token_is_rejected(): void
    {
        $a = $this->account('a');
        $this->account('b');

        $this->postJson('/api/v1/auth/login/select', ['selection_token' => 'garbage', 'user_id' => $a->id])
            ->assertStatus(422)->assertJsonPath('error.code', 'INVALID_SELECTION');

        $expired = Crypt::encryptString(json_encode(['ids' => [$a->id], 'exp' => now()->subMinute()->timestamp]));
        $this->postJson('/api/v1/auth/login/select', ['selection_token' => $expired, 'user_id' => $a->id])
            ->assertStatus(422)->assertJsonPath('error.code', 'INVALID_SELECTION');
    }

    public function test_deactivated_company_is_not_offered(): void
    {
        $a = $this->account('a');
        $this->account('b', companyActive: false);

        // Faqat bitta faol akkaunt qoladi — to'g'ridan-to'g'ri kiradi, tanlov yo'q
        $this->login()->assertOk()
            ->assertJsonPath('data.user.id', $a->id)
            ->assertJsonMissingPath('data.requires_company_selection');
    }

    public function test_different_passwords_still_log_in_directly(): void
    {
        $a = $this->account('a', password: 'secret123');
        $this->account('b', password: 'other4567');

        $this->login('secret123')->assertOk()->assertJsonPath('data.user.id', $a->id);
    }
}
