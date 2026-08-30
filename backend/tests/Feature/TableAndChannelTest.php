<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Contracts\Broadcasting\Factory as BroadcastingFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TableAndChannelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Resolve the closure registered for the kitchen channel in
     * routes/channels.php, exactly as the broadcasting auth endpoint would.
     */
    private function kitchenChannelCallback(): callable
    {
        $callback = app(BroadcastingFactory::class)
            ->connection()
            ->getChannels()
            ->get('kitchen.{companyId}.{branchId}');

        $this->assertIsCallable($callback, 'kitchen.{companyId}.{branchId} channel is not registered.');

        return $callback;
    }

    private function makeCompanyWithTwoBranches(): array
    {
        $company = Company::create([
            'name' => 'Tables Co', 'slug' => 'tables-co', 'phone' => '+998900000000', 'is_active' => true,
        ]);
        $branchA = Branch::create(['company_id' => $company->id, 'name' => 'Branch A', 'is_active' => true]);
        $branchB = Branch::create(['company_id' => $company->id, 'name' => 'Branch B', 'is_active' => true]);

        return [$company, $branchA, $branchB];
    }

    private function makeUser(Company $company, ?Branch $branch, string $role, string $phone): User
    {
        return User::create([
            'company_id' => $company->id,
            'branch_id' => $branch?->id,
            'name' => ucfirst($role),
            'phone' => $phone,
            'role' => $role,
            'password' => 'secret123',
            'is_active' => true,
        ]);
    }

    // --- Broadcast channel authorization (task 3) -------------------------

    public function test_waiter_from_other_branch_cannot_join_kitchen_channel(): void
    {
        [$company, $branchA, $branchB] = $this->makeCompanyWithTwoBranches();
        $waiterB = $this->makeUser($company, $branchB, 'waiter', '+998901111111');

        $callback = $this->kitchenChannelCallback();

        $result = $callback($waiterB, $company->id, $branchA->id);

        $this->assertFalse((bool) $result);
    }

    public function test_company_admin_can_join_any_branch_kitchen_channel(): void
    {
        [$company, $branchA, $branchB] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchB, 'company_admin', '+998902222222');

        $callback = $this->kitchenChannelCallback();

        $this->assertTrue((bool) $callback($admin, $company->id, $branchA->id));
        $this->assertTrue((bool) $callback($admin, $company->id, $branchB->id));
    }

    public function test_cashier_can_join_own_branch_kitchen_channel(): void
    {
        [$company, $branchA, $branchB] = $this->makeCompanyWithTwoBranches();
        $cashier = $this->makeUser($company, $branchA, 'cashier', '+998903333333');

        $callback = $this->kitchenChannelCallback();

        $this->assertTrue((bool) $callback($cashier, $company->id, $branchA->id));
        $this->assertFalse((bool) $callback($cashier, $company->id, $branchB->id));
    }

    public function test_staff_with_no_branch_assigned_cannot_join_any_kitchen_channel(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $chef = $this->makeUser($company, null, 'chef', '+998904444444');

        $callback = $this->kitchenChannelCallback();

        $this->assertFalse((bool) $callback($chef, $company->id, $branchA->id));
    }

    public function test_staff_cannot_join_another_companys_kitchen_channel(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $otherCompany = Company::create([
            'name' => 'Other Co', 'slug' => 'other-co', 'phone' => '+998900000099', 'is_active' => true,
        ]);
        $waiter = $this->makeUser($company, $branchA, 'waiter', '+998905555555');

        $callback = $this->kitchenChannelCallback();

        $this->assertFalse((bool) $callback($waiter, $otherCompany->id, $branchA->id));
    }

    // --- Telegram rate limiting (task 4) -----------------------------------

    public function test_telegram_order_route_has_stricter_throttle_than_menu(): void
    {
        $ordersRoute = collect(Route::getRoutes())->first(
            fn ($route) => $route->uri() === 'api/v1/tg/orders' && in_array('POST', $route->methods(), true)
        );
        $menuRoute = collect(Route::getRoutes())->first(
            fn ($route) => $route->uri() === 'api/v1/tg/menu' && in_array('GET', $route->methods(), true)
        );

        $this->assertNotNull($ordersRoute, 'POST tg/orders route not found.');
        $this->assertNotNull($menuRoute, 'GET tg/menu route not found.');

        $ordersMiddleware = $ordersRoute->gatherMiddleware();
        $menuMiddleware = $menuRoute->gatherMiddleware();

        $this->assertTrue(
            collect($ordersMiddleware)->contains(fn ($m) => str_starts_with($m, 'throttle:10')),
            'POST tg/orders is missing the stricter throttle:10,1 middleware.'
        );
        $this->assertTrue(
            collect($menuMiddleware)->contains(fn ($m) => str_starts_with($m, 'throttle:60')),
            'GET tg/menu is missing the throttle:60,1 middleware.'
        );
    }

    // --- Table transfer (task 6) -------------------------------------------

    public function test_transferring_table_moves_active_orders_but_not_paid_ones(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998906666666');

        $source = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '1', 'seats' => 4, 'status' => 'occupied']);
        $target = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '2', 'seats' => 4, 'status' => 'free']);

        $activeOrder = Order::create([
            'company_id' => $company->id, 'branch_id' => $branchA->id, 'table_id' => $source->id,
            'type' => 'dine_in', 'status' => 'preparing', 'subtotal' => 10000, 'total' => 10000,
        ]);
        $paidOrder = Order::create([
            'company_id' => $company->id, 'branch_id' => $branchA->id, 'table_id' => $source->id,
            'type' => 'dine_in', 'status' => 'paid', 'subtotal' => 20000, 'total' => 20000,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/tables/{$source->id}/transfer", [
            'target_table_id' => $target->id,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $activeOrder->id, 'table_id' => $target->id]);
        $this->assertDatabaseHas('orders', ['id' => $paidOrder->id, 'table_id' => $source->id]);
    }

    // --- Table merge/unmerge (task 7) ---------------------------------------

    public function test_cannot_merge_table_with_itself(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998907777777');
        $table = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '1', 'seats' => 4, 'status' => 'free']);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/tables/{$table->id}/merge", [
            'target_table_id' => $table->id,
        ]);

        $response->assertStatus(422);
        $this->assertSame('CANNOT_MERGE_SELF', $response->json('error.code'));
    }

    public function test_cannot_merge_into_a_table_from_another_branch(): void
    {
        [$company, $branchA, $branchB] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998908888888');
        $table = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '1', 'seats' => 4, 'status' => 'free']);
        $otherBranchTable = Table::create(['company_id' => $company->id, 'branch_id' => $branchB->id, 'number' => '1', 'seats' => 4, 'status' => 'free']);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/tables/{$table->id}/merge", [
            'target_table_id' => $otherBranchTable->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_unmerge_requires_table_to_be_merged(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998909999999');
        $table = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '1', 'seats' => 4, 'status' => 'free']);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/tables/{$table->id}/unmerge");

        $response->assertStatus(422);
        $this->assertSame('TABLE_NOT_MERGED', $response->json('error.code'));
    }

    // --- Table status / delete guards (task 8) ------------------------------

    public function test_cannot_free_a_table_with_an_active_order(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998910000000');
        $table = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '1', 'seats' => 4, 'status' => 'occupied']);

        Order::create([
            'company_id' => $company->id, 'branch_id' => $branchA->id, 'table_id' => $table->id,
            'type' => 'dine_in', 'status' => 'preparing', 'subtotal' => 10000, 'total' => 10000,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/v1/tables/{$table->id}/status", ['status' => 'free']);

        $response->assertStatus(422);
        $this->assertSame('TABLE_HAS_ACTIVE_ORDERS', $response->json('error.code'));
        $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => 'occupied']);
    }

    public function test_can_free_a_table_once_its_order_is_paid(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998911111111');
        $table = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '1', 'seats' => 4, 'status' => 'occupied']);

        Order::create([
            'company_id' => $company->id, 'branch_id' => $branchA->id, 'table_id' => $table->id,
            'type' => 'dine_in', 'status' => 'paid', 'subtotal' => 10000, 'total' => 10000,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/v1/tables/{$table->id}/status", ['status' => 'free']);

        $response->assertOk();
        $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => 'free']);
    }

    public function test_cannot_delete_a_table_with_an_active_order(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998912222222');
        $table = Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => '1', 'seats' => 4, 'status' => 'occupied']);

        Order::create([
            'company_id' => $company->id, 'branch_id' => $branchA->id, 'table_id' => $table->id,
            'type' => 'dine_in', 'status' => 'ready', 'subtotal' => 10000, 'total' => 10000,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->deleteJson("/api/v1/tables/{$table->id}");

        $response->assertStatus(422);
        $this->assertSame('TABLE_HAS_ACTIVE_ORDERS', $response->json('error.code'));
        $this->assertDatabaseHas('tables', ['id' => $table->id]);
    }

    // --- Table number validation (task 9) -----------------------------------

    public function test_table_number_accepts_alphanumeric_zone_codes(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998913333333');

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/tables', [
            'number' => 'A1',
            'seats' => 4,
            'branch_id' => $branchA->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('tables', [
            'company_id' => $company->id,
            'branch_id' => $branchA->id,
            'number' => 'A1',
        ]);

        // The column is a string, so the value must survive the round-trip
        // through Eloquent as well - an `integer` cast would return 0 here.
        $response->assertJsonPath('data.number', 'A1');
        $this->assertSame('A1', Table::where('branch_id', $branchA->id)->first()->number);
    }

    public function test_duplicate_table_number_in_same_branch_returns_validation_error(): void
    {
        [$company, $branchA] = $this->makeCompanyWithTwoBranches();
        $admin = $this->makeUser($company, $branchA, 'company_admin', '+998914444444');
        Table::create(['company_id' => $company->id, 'branch_id' => $branchA->id, 'number' => 'A1', 'seats' => 4, 'status' => 'free']);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/tables', [
            'number' => 'A1',
            'seats' => 4,
            'branch_id' => $branchA->id,
        ]);

        $response->assertStatus(422);
    }
}
