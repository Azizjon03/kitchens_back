<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** #43: ofitsiant o'z buyurtmalarini ko'radi — ?mine=1 va soni. */
class WaiterDraftTest extends TestCase
{
    use RefreshDatabase;

    public function test_waiter_sees_only_own_orders_and_stats(): void
    {
        $company = Company::create(['name' => 'A', 'slug' => 'a', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'F', 'is_active' => true]);
        $w1 = User::create(['company_id' => $company->id, 'branch_id' => $branch->id, 'name' => 'W1', 'phone' => '+998900000001', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        $w2 = User::create(['company_id' => $company->id, 'branch_id' => $branch->id, 'name' => 'W2', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        $cat = Category::create(['company_id' => $company->id, 'name_uz' => 'T', 'is_active' => true]);
        $item = MenuItem::create(['company_id' => $company->id, 'category_id' => $cat->id, 'name_uz' => 'Osh', 'price' => 30000, 'is_available' => true]);
        $mk = function (User $w, string $n) use ($company, $branch, $item) {
            $t = Table::create(['company_id' => $company->id, 'branch_id' => $branch->id, 'number' => $n, 'seats' => 4, 'status' => 'free']);
            Sanctum::actingAs($w);

            return $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'branch_id' => $branch->id, 'table_id' => $t->id, 'items' => [['menu_item_id' => $item->id, 'quantity' => 2]]])->assertCreated()->json('data.id');
        };
        $mk($w1, '1');
        $mk($w1, '2');
        $mk($w2, '3');

        Sanctum::actingAs($w1);
        $this->assertCount(2, $this->getJson('/api/v1/orders?active=1&mine=1')->assertOk()->json('data'));
        $this->assertCount(3, $this->getJson('/api/v1/orders?active=1')->json('data'));
        $this->getJson('/api/v1/orders/my-stats')->assertOk()
            ->assertJsonPath('data.preparing', 2)->assertJsonPath('data.today_count', 2)->assertJsonPath('data.today_total', 120000);
    }

    public function test_cashier_uses_waiter_screen_tables_and_orders(): void
    {
        $company = Company::create(['name' => 'A', 'slug' => 'a', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'F', 'is_active' => true]);
        $cashier = User::create(['company_id' => $company->id, 'branch_id' => $branch->id, 'name' => 'K', 'phone' => '+998900000005', 'role' => 'cashier', 'password' => 'secret123', 'is_active' => true]);
        $cat = Category::create(['company_id' => $company->id, 'name_uz' => 'T', 'is_active' => true]);
        $item = MenuItem::create(['company_id' => $company->id, 'category_id' => $cat->id, 'name_uz' => 'Osh', 'price' => 30000, 'is_available' => true]);
        $t = Table::create(['company_id' => $company->id, 'branch_id' => $branch->id, 'number' => '1', 'seats' => 4, 'status' => 'free']);

        Sanctum::actingAs($cashier);
        $this->getJson('/api/v1/tables')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/table-groups')->assertOk();
        $this->getJson('/api/v1/pos/menu')->assertOk();
        $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'branch_id' => $branch->id, 'table_id' => $t->id, 'items' => [['menu_item_id' => $item->id, 'quantity' => 1]]])->assertCreated();
        // Stollarni boshqarish — kassirga emas
        $this->postJson('/api/v1/tables', ['number' => '2', 'seats' => 4, 'branch_id' => $branch->id])->assertForbidden();
    }
}
