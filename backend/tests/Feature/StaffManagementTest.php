<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): array
    {
        $company = Company::create([
            'name' => 'Test Co', 'slug' => 'test-co', 'phone' => '+998900000000', 'is_active' => true,
        ]);

        $admin = User::create([
            'company_id' => $company->id, 'name' => 'Admin', 'phone' => '+998900000001',
            'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true,
        ]);

        return [$company, $admin];
    }

    public function test_company_admin_can_create_staff(): void
    {
        [$company, $admin] = $this->admin();
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Main', 'is_active' => true]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/users', [
            'name' => 'Oshpaz Vali',
            'phone' => '+998901234567',
            'role' => 'chef',
            'branch_id' => $branch->id,
            'password' => 'password123',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'company_id' => $company->id,
            'phone' => '+998901234567',
            'role' => 'chef',
        ]);
    }

    public function test_super_admin_role_cannot_be_created_as_staff(): void
    {
        [, $admin] = $this->admin();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/users', [
            'name' => 'Hacker',
            'phone' => '+998901234999',
            'role' => 'super_admin',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_staff_listing_excludes_other_companies(): void
    {
        [$company, $admin] = $this->admin();

        $other = Company::create(['name' => 'Other', 'slug' => 'other', 'phone' => '+998900000099', 'is_active' => true]);
        User::create([
            'company_id' => $other->id, 'name' => 'Foreign chef', 'phone' => '+998905555555',
            'role' => 'chef', 'password' => 'secret123', 'is_active' => true,
        ]);

        User::create([
            'company_id' => $company->id, 'name' => 'My chef', 'phone' => '+998906666666',
            'role' => 'chef', 'password' => 'secret123', 'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/users');
        $response->assertOk();

        $phones = collect($response->json('data.data'))->pluck('phone');
        $this->assertTrue($phones->contains('+998906666666'));
        $this->assertFalse($phones->contains('+998905555555'));
    }
}
