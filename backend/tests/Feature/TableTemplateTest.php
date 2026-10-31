<?php

namespace Tests\Feature;

use App\Events\OrderStatusUpdated;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #24: stol shablonlari — stolga oldindan qo'yiladigan narsalar; hisob yopilishidan
 * oldin faqat ishlatilgani (ofitsiant belgilagani) hisobga qo'shiladi, KDS'ga bormaydi.
 */
class TableTemplateTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private User $admin;
    private User $waiter;
    private MenuItem $sok;
    private MenuItem $mohito;
    private MenuItem $osh;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::create([
            'name' => 'Stol', 'slug' => 'stol', 'phone' => '+998700000000', 'is_active' => true,
            'settings_json' => ['service_charge_pct' => 0],
        ]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $this->admin = User::create(['company_id' => $this->company->id, 'name' => 'Admin', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]);
        $this->waiter = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'Ofitsiant', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        $cat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Ichimliklar', 'name_ru' => 'Напитки', 'is_active' => true]);
        $this->sok = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => 'Sharbat', 'sell_type' => 'portion', 'price' => 18000, 'is_available' => true]);
        $this->mohito = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => 'Mohito', 'sell_type' => 'portion', 'price' => 17000, 'is_available' => true]);
        $this->osh = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => 'Osh', 'sell_type' => 'portion', 'price' => 27000, 'is_available' => true]);
    }

    private function template(): int
    {
        Sanctum::actingAs($this->admin);

        return $this->postJson('/api/v1/table-templates', [
            'name' => 'VIP stol',
            'items' => [['menu_item_id' => $this->sok->id, 'quantity' => 3], ['menu_item_id' => $this->mohito->id, 'quantity' => 4]],
        ])->assertCreated()->json('data.id');
    }

    /** Shablonli stol + ofitsiantning osh buyurtmasi */
    private function seatedOrder(): Order
    {
        $templateId = $this->template();
        $tableId = $this->postJson('/api/v1/tables', ['number' => 'V1', 'seats' => 6, 'table_template_id' => $templateId])
            ->assertCreated()->assertJsonPath('data.table_template_id', $templateId)->json('data.id');

        Sanctum::actingAs($this->waiter);
        $id = $this->postJson('/api/v1/orders', [
            'type' => 'dine_in', 'table_id' => $tableId, 'items' => [['menu_item_id' => $this->osh->id, 'quantity' => 1]],
        ])->assertCreated()->json('data.id');

        return Order::findOrFail($id);
    }

    public function test_admin_creates_template_with_items(): void
    {
        $id = $this->template();

        $this->getJson('/api/v1/table-templates')->assertOk()
            ->assertJsonPath('data.0.id', $id)
            ->assertJsonPath('data.0.name', 'VIP stol')
            ->assertJsonCount(2, 'data.0.items');
    }

    public function test_foreign_menu_item_and_foreign_template_are_rejected(): void
    {
        $other = Company::create(['name' => 'B', 'slug' => 'b', 'phone' => '+998700000009', 'is_active' => true]);
        $otherCat = Category::create(['company_id' => $other->id, 'name_uz' => 'X', 'is_active' => true]);
        $foreign = MenuItem::create(['company_id' => $other->id, 'category_id' => $otherCat->id, 'name_uz' => 'Begona', 'sell_type' => 'portion', 'price' => 1000, 'is_available' => true]);
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/table-templates', ['name' => 'X', 'items' => [['menu_item_id' => $foreign->id, 'quantity' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.menu_item_id');

        $foreignTemplateId = \DB::table('table_templates')->insertGetId(['company_id' => $other->id, 'name' => 'Begona', 'created_at' => now(), 'updated_at' => now()]);
        $this->postJson('/api/v1/tables', ['number' => 'Z', 'seats' => 2, 'table_template_id' => $foreignTemplateId])
            ->assertStatus(422)->assertJsonValidationErrors('table_template_id');
    }

    public function test_only_used_items_are_billed_and_kitchen_is_not_notified(): void
    {
        $order = $this->seatedOrder();

        $this->getJson("/api/v1/orders/{$order->id}/table-set")->assertOk()
            ->assertJsonPath('data.template.name', 'VIP stol')
            ->assertJsonPath('data.items.0.placed', 3)
            ->assertJsonPath('data.items.0.used', 0);

        Event::fake([OrderStatusUpdated::class]);
        $this->putJson("/api/v1/orders/{$order->id}/table-set", [
            'items' => [['menu_item_id' => $this->sok->id, 'quantity' => 2]],
        ])->assertOk()->assertJsonPath('data.items.0.used', 2);
        Event::assertNotDispatched(OrderStatusUpdated::class);

        $order->refresh();
        $this->assertEquals(27000 + 2 * 18000, (float) $order->total, 'Osh + 2 ta ishlatilgan sharbat; mohito hisobga kirmaydi');
        $this->assertSame(1, $order->orderItems()->where('is_table_set', true)->count());

        // Qayta belgilash — almashtiradi, qo'shib ketmaydi
        $this->putJson("/api/v1/orders/{$order->id}/table-set", ['items' => [['menu_item_id' => $this->sok->id, 'quantity' => 1], ['menu_item_id' => $this->mohito->id, 'quantity' => 4]]])->assertOk();
        $this->assertEquals(27000 + 18000 + 4 * 17000, (float) $order->fresh()->total);
    }

    public function test_cannot_mark_more_than_placed_or_items_outside_template(): void
    {
        $order = $this->seatedOrder();

        $this->putJson("/api/v1/orders/{$order->id}/table-set", ['items' => [['menu_item_id' => $this->sok->id, 'quantity' => 4]]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.quantity');
        $this->putJson("/api/v1/orders/{$order->id}/table-set", ['items' => [['menu_item_id' => $this->osh->id, 'quantity' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.menu_item_id');
    }

    public function test_editing_the_order_keeps_table_set_lines(): void
    {
        $order = $this->seatedOrder();
        $this->putJson("/api/v1/orders/{$order->id}/table-set", ['items' => [['menu_item_id' => $this->sok->id, 'quantity' => 2]]])->assertOk();

        $this->putJson("/api/v1/orders/{$order->id}", ['items' => [['menu_item_id' => $this->osh->id, 'quantity' => 2]]])->assertOk();

        $order->refresh();
        $this->assertSame(1, $order->orderItems()->where('is_table_set', true)->count());
        $this->assertEquals(2 * 27000 + 2 * 18000, (float) $order->total);
    }

    public function test_table_without_template_has_no_table_set_and_chef_cannot_mark(): void
    {
        Sanctum::actingAs($this->admin);
        $table = Table::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'number' => 'P1', 'seats' => 2, 'status' => 'free']);
        Sanctum::actingAs($this->waiter);
        $orderId = $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'table_id' => $table->id, 'items' => [['menu_item_id' => $this->osh->id, 'quantity' => 1]]])->json('data.id');

        $this->getJson("/api/v1/orders/{$orderId}/table-set")->assertOk()->assertJsonPath('data.template', null);
        $this->putJson("/api/v1/orders/{$orderId}/table-set", ['items' => [['menu_item_id' => $this->sok->id, 'quantity' => 1]]])
            ->assertStatus(422)->assertJsonPath('error.code', 'NO_TABLE_SET');

        $chef = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'Oshpaz', 'phone' => '+998900000003', 'role' => 'chef', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($chef);
        $this->putJson("/api/v1/orders/{$orderId}/table-set", ['items' => []])->assertForbidden();
    }
}
