<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Modifier;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers the three cross-tenant/limit gaps this pass closes:
 *
 *  1. Raw `exists:` validation rules bypass the CompanyScope global scope,
 *     so a company_admin could previously assign a foreign company's
 *     branch/table/modifier id to their own records.
 *  2. Plan `max_branches` / `max_staff` limits were never enforced.
 *  3. `Subscription::current_period_end` was written but never read by
 *     EnsureCompanyActive.
 */
class TenantLimitsTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: Company, 1: User} */
    private function companyWithAdmin(string $slug, string $phone): array
    {
        $company = Company::create([
            'name' => ucfirst($slug), 'slug' => $slug, 'phone' => $phone, 'is_active' => true,
        ]);

        $admin = User::create([
            'company_id' => $company->id, 'name' => 'Admin', 'phone' => $phone.'1',
            'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true,
        ]);

        return [$company, $admin];
    }

    private function subscribe(Company $company, Plan $plan, ?Carbon $periodEnd): Subscription
    {
        return Subscription::create([
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'current_period_start' => now()->subDay(),
            'current_period_end' => $periodEnd,
        ]);
    }

    // -----------------------------------------------------------------
    // Task 1 - `exists:` rules bypassing CompanyScope
    // -----------------------------------------------------------------

    public function test_staff_cannot_be_assigned_to_another_companys_branch(): void
    {
        [, $adminA] = $this->companyWithAdmin('alpha', '+998900000001');
        [$companyB] = $this->companyWithAdmin('beta', '+998900000002');
        $branchB = Branch::create(['company_id' => $companyB->id, 'name' => 'Beta Main', 'is_active' => true]);

        Sanctum::actingAs($adminA);

        $response = $this->postJson('/api/v1/users', [
            'name' => 'Sneaky Waiter',
            'phone' => '+998901234567',
            'role' => 'waiter',
            'branch_id' => $branchB->id,
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('branch_id');
        $this->assertDatabaseMissing('users', ['phone' => '+998901234567']);
    }

    public function test_order_cannot_be_created_with_another_companys_branch(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin('gamma', '+998900000003');
        [$companyB] = $this->companyWithAdmin('delta', '+998900000004');
        $branchB = Branch::create(['company_id' => $companyB->id, 'name' => 'Delta Main', 'is_active' => true]);

        $category = Category::create(['company_id' => $companyA->id, 'name_uz' => 'Taomlar', 'sort_order' => 1, 'is_active' => true]);
        $item = MenuItem::create([
            'company_id' => $companyA->id, 'category_id' => $category->id, 'name_uz' => 'Osh',
            'sell_type' => 'portion', 'price' => 30000, 'is_available' => true,
        ]);

        Sanctum::actingAs($adminA);

        $response = $this->postJson('/api/v1/orders', [
            'branch_id' => $branchB->id,
            'type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('branch_id');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_cannot_be_created_with_another_companys_table(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin('epsilon', '+998900000005');
        [$companyB] = $this->companyWithAdmin('zeta', '+998900000006');

        $branchA = Branch::create(['company_id' => $companyA->id, 'name' => 'Epsilon Main', 'is_active' => true]);
        $branchB = Branch::create(['company_id' => $companyB->id, 'name' => 'Zeta Main', 'is_active' => true]);
        $tableB = Table::create(['company_id' => $companyB->id, 'branch_id' => $branchB->id, 'number' => '1', 'seats' => 4, 'status' => 'free']);

        $category = Category::create(['company_id' => $companyA->id, 'name_uz' => 'Taomlar', 'sort_order' => 1, 'is_active' => true]);
        $item = MenuItem::create([
            'company_id' => $companyA->id, 'category_id' => $category->id, 'name_uz' => 'Osh',
            'sell_type' => 'portion', 'price' => 30000, 'is_available' => true,
        ]);

        Sanctum::actingAs($adminA);

        $response = $this->postJson('/api/v1/orders', [
            'branch_id' => $branchA->id,
            'table_id' => $tableB->id,
            'type' => 'dine_in',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('table_id');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_cannot_use_another_companys_modifier(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin('eta', '+998900000007');
        [$companyB] = $this->companyWithAdmin('theta', '+998900000008');

        $branchA = Branch::create(['company_id' => $companyA->id, 'name' => 'Eta Main', 'is_active' => true]);
        $category = Category::create(['company_id' => $companyA->id, 'name_uz' => 'Taomlar', 'sort_order' => 1, 'is_active' => true]);
        $item = MenuItem::create([
            'company_id' => $companyA->id, 'category_id' => $category->id, 'name_uz' => 'Osh',
            'sell_type' => 'portion', 'price' => 30000, 'is_available' => true,
        ]);
        $foreignModifier = Modifier::create(['company_id' => $companyB->id, 'name_uz' => 'Achchiq', 'is_active' => true]);

        Sanctum::actingAs($adminA);

        $response = $this->postJson('/api/v1/orders', [
            'branch_id' => $branchA->id,
            'type' => 'takeaway',
            'items' => [[
                'menu_item_id' => $item->id,
                'quantity' => 1,
                'modifier_ids' => [$foreignModifier->id],
            ]],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('items.0.modifier_ids.0');
        $this->assertDatabaseCount('orders', 0);
    }

    // -----------------------------------------------------------------
    // Task 2 - Plan max_branches / max_staff limits
    // -----------------------------------------------------------------

    public function test_new_branch_is_rejected_once_the_plan_max_branches_is_reached(): void
    {
        [$company, $admin] = $this->companyWithAdmin('limitb', '+998900000009');
        $plan = Plan::create([
            'name' => 'limitb-plan', 'display_name' => 'Limited', 'price_monthly' => 0,
            'max_branches' => 1, 'max_staff' => -1, 'is_active' => true,
        ]);
        $this->subscribe($company, $plan, now()->addMonth());
        Branch::create(['company_id' => $company->id, 'name' => 'Existing Branch', 'is_active' => true]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/branches', ['name' => 'Second Branch']);

        $response->assertStatus(422);
        $this->assertSame('PLAN_LIMIT_REACHED', $response->json('error.code'));
        $this->assertSame(1, Branch::where('company_id', $company->id)->count());
    }

    public function test_max_branches_of_negative_one_means_unlimited(): void
    {
        [$company, $admin] = $this->companyWithAdmin('unlimb', '+998900000010');
        $plan = Plan::create([
            'name' => 'unlimb-plan', 'display_name' => 'Unlimited', 'price_monthly' => 0,
            'max_branches' => -1, 'max_staff' => -1, 'is_active' => true,
        ]);
        $this->subscribe($company, $plan, now()->addMonth());
        Branch::create(['company_id' => $company->id, 'name' => 'Existing Branch', 'is_active' => true]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/branches', ['name' => 'Second Branch']);

        $response->assertCreated();
        $this->assertSame(2, Branch::where('company_id', $company->id)->count());
    }

    public function test_new_staff_is_rejected_once_the_plan_max_staff_is_reached(): void
    {
        [$company, $admin] = $this->companyWithAdmin('limits', '+998900000011');
        $plan = Plan::create([
            'name' => 'limits-plan', 'display_name' => 'Limited', 'price_monthly' => 0,
            'max_branches' => -1, 'max_staff' => 1, 'is_active' => true,
        ]);
        $this->subscribe($company, $plan, now()->addMonth());
        User::create([
            'company_id' => $company->id, 'name' => 'Existing Waiter', 'phone' => '+998900000099',
            'role' => 'waiter', 'password' => 'secret123', 'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/users', [
            'name' => 'Second Waiter', 'phone' => '+998900000098',
            'role' => 'waiter', 'password' => 'password123',
        ]);

        $response->assertStatus(422);
        $this->assertSame('PLAN_LIMIT_REACHED', $response->json('error.code'));
        $this->assertDatabaseMissing('users', ['phone' => '+998900000098']);
    }

    public function test_soft_deleted_staff_does_not_count_towards_the_staff_limit(): void
    {
        [$company, $admin] = $this->companyWithAdmin('softdel', '+998900000012');
        $plan = Plan::create([
            'name' => 'softdel-plan', 'display_name' => 'Limited', 'price_monthly' => 0,
            'max_branches' => -1, 'max_staff' => 1, 'is_active' => true,
        ]);
        $this->subscribe($company, $plan, now()->addMonth());
        $removedWaiter = User::create([
            'company_id' => $company->id, 'name' => 'Removed Waiter', 'phone' => '+998900000097',
            'role' => 'waiter', 'password' => 'secret123', 'is_active' => true,
        ]);
        $removedWaiter->delete();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/users', [
            'name' => 'New Waiter', 'phone' => '+998900000096',
            'role' => 'waiter', 'password' => 'password123',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', ['phone' => '+998900000096']);
    }

    // -----------------------------------------------------------------
    // Task 3 - Subscription current_period_end
    // -----------------------------------------------------------------

    public function test_expired_subscription_blocks_access_with_403(): void
    {
        [$company, $admin] = $this->companyWithAdmin('expired', '+998900000013');
        $plan = Plan::create([
            'name' => 'expired-plan', 'display_name' => 'Any', 'price_monthly' => 0,
            'max_branches' => -1, 'max_staff' => -1, 'is_active' => true,
        ]);
        $this->subscribe($company, $plan, now()->subDay());

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/branches');

        $response->assertStatus(403);
        $this->assertSame('SUBSCRIPTION_EXPIRED', $response->json('error.code'));
    }

    public function test_null_current_period_end_never_blocks_access(): void
    {
        [$company, $admin] = $this->companyWithAdmin('nullend', '+998900000014');
        $plan = Plan::create([
            'name' => 'nullend-plan', 'display_name' => 'Any', 'price_monthly' => 0,
            'max_branches' => -1, 'max_staff' => -1, 'is_active' => true,
        ]);
        $this->subscribe($company, $plan, null);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/branches');

        $response->assertOk();
    }

    public function test_company_without_a_subscription_is_not_blocked(): void
    {
        [, $admin] = $this->companyWithAdmin('nosub', '+998900000015');

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/branches');

        $response->assertOk();
    }
}
