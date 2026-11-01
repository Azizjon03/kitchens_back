<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** #44: chek ma'lumoti — taomlar, qo'shimcha soni, xizmat haqi, restoran. */
class ReceiptTest extends TestCase
{
    use RefreshDatabase;

    public function test_receipt_has_items_addons_totals_and_is_tenant_scoped(): void
    {
        $company = Company::create(['name' => 'Oliyaviy', 'slug' => 'oliyaviy', 'phone' => '691234567', 'address' => 'Chust, Navoiy 5', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 10]]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $waiter = User::create(['company_id' => $company->id, 'branch_id' => $branch->id, 'name' => 'Dilshod', 'phone' => '+998900000001', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        $cat = Category::create(['company_id' => $company->id, 'name_uz' => 'Taomlar', 'is_active' => true]);
        $osh = MenuItem::create(['company_id' => $company->id, 'category_id' => $cat->id, 'name_uz' => "Osh (to'y oshi)", 'price' => 45000, 'is_available' => true]);
        $meat = Addon::create(['company_id' => $company->id, 'name_uz' => "Go'sht", 'price' => 12000, 'is_active' => true, 'max_quantity' => 3]);
        $osh->addons()->attach($meat->id);
        $table = Table::create(['company_id' => $company->id, 'branch_id' => $branch->id, 'number' => '5', 'seats' => 4, 'status' => 'free']);

        Sanctum::actingAs($waiter);
        $id = $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'branch_id' => $branch->id, 'table_id' => $table->id, 'items' => [
            ['menu_item_id' => $osh->id, 'quantity' => 1, 'addons' => [['id' => $meat->id, 'quantity' => 2]]],
        ]])->assertCreated()->json('data.id');

        $r = $this->getJson("/api/v1/orders/{$id}/receipt")->assertOk();
        $r->assertJsonPath('data.company.name', 'Oliyaviy')
            ->assertJsonPath('data.company.phone', '+998 (69) 123-45-67')
            ->assertJsonPath('data.order.table', '5')
            ->assertJsonPath('data.order.waiter', 'Dilshod')
            ->assertJsonPath('data.items.0.addons.0.quantity', 2)
            ->assertJsonPath('data.order.subtotal', 69000)
            ->assertJsonPath('data.order.service_charge_amount', 6900)
            ->assertJsonPath('data.order.total', 75900);

        $other = Company::create(['name' => 'B', 'slug' => 'b', 'phone' => '+998700000001', 'is_active' => true]);
        Sanctum::actingAs(User::create(['company_id' => $other->id, 'name' => 'X', 'phone' => '+998900000009', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]));
        $this->getJson("/api/v1/orders/{$id}/receipt")->assertNotFound();
    }
}
