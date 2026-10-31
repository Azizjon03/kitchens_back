<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperAdminCompanyTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        Plan::create([
            'name' => 'free', 'display_name' => 'Free', 'price_monthly' => 0,
            'max_branches' => 1, 'max_staff' => 5, 'is_active' => true,
        ]);

        return User::create([
            'name' => 'Super', 'phone' => '+998906921469', 'role' => 'super_admin',
            'password' => 'password', 'is_active' => true,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Oliyaviy Restoran',
            'slug' => 'oliyaviy-restoran',
            'phone' => '+998902783610',
            'owner_full_name' => 'Ali Valiyev',
            'owner_phone' => '+998 (90) 111-22-33',
            'owner_email' => 'ali@example.com',
            'owner_password' => 'secret123',
        ], $overrides);
    }

    public function test_creating_company_also_creates_its_admin_who_can_log_in(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/super/companies', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.slug', 'oliyaviy-restoran');

        $company = Company::where('slug', 'oliyaviy-restoran')->firstOrFail();
        $admin = User::where('company_id', $company->id)->where('role', 'company_admin')->first();

        $this->assertNotNull($admin, 'Kompaniya admini yaratilmadi');
        $this->assertSame('+998901112233', $admin->phone);
        $this->assertSame('Ali Valiyev', $admin->name);
        $this->assertTrue($admin->is_active);
        $this->assertNotNull($company->subscription);

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/v1/auth/login', [
            'phone' => '+998901112233',
            'password' => 'secret123',
        ])->assertOk()->assertJsonPath('data.user.role', 'company_admin');
    }

    public function test_owner_fields_are_required(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/super/companies', $this->payload([
            'owner_full_name' => null, 'owner_phone' => null, 'owner_password' => null,
        ]))->assertStatus(422);

        $this->assertSame(0, Company::count(), 'Admin yaroqsiz bo\'lsa kompaniya ham yaratilmasligi kerak');
    }

    public function test_company_phone_is_required_and_returns_422_not_500(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/super/companies', $this->payload(['phone' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_company_phone_cannot_be_cleared_on_update(): void
    {
        Sanctum::actingAs($this->superAdmin());
        $this->postJson('/api/v1/super/companies', $this->payload())->assertCreated();
        $company = Company::firstOrFail();

        $this->putJson("/api/v1/super/companies/{$company->id}", ['phone' => null])
            ->assertStatus(422);

        $this->putJson("/api/v1/super/companies/{$company->id}", ['name' => 'Yangi nom'])
            ->assertOk();
        $this->assertSame('+998902783610', $company->fresh()->phone);
    }

    public function test_short_owner_password_is_rejected_and_nothing_is_created(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/super/companies', $this->payload(['owner_password' => '123']))
            ->assertStatus(422);

        $this->assertSame(0, Company::count());
        $this->assertSame(1, User::count());
    }
}
