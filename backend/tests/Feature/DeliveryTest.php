<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #39: bot buyurtmalari — saqlangan manzillar (Uy, Ish), menejer tasdiqlaydi yoki
 * rad etadi, tasdiqlangandan keyingina oshxonaga tushadi.
 */
class DeliveryTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private User $manager;
    private MenuItem $item;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => true]);
        Http::fake(fn (HttpRequest $r) => Http::response(['ok' => true, 'result' => ['message_id' => 1]]));
        $this->company = Company::create(['name' => 'Oliyaviy', 'slug' => 'oliyaviy', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy', 'is_active' => true]);
        $this->manager = User::create(['company_id' => $this->company->id, 'name' => 'Aziz', 'phone' => '+998900000001', 'role' => 'manager', 'password' => 'secret123', 'is_active' => true]);
        $cat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Taomlar', 'is_active' => true]);
        $this->item = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => "Lag'mon", 'price' => 38000, 'is_available' => true]);
        Customer::create(['telegram_id' => '777', 'name' => 'Vali Aliyev', 'phone' => '+998901234567', 'latitude' => 40.9983, 'longitude' => 71.2372, 'address' => 'Mustaqillik 12', 'registered_at' => now()]);
    }

    private function tg(): array
    {
        return ['X-Telegram-Dev-Id' => '777'];
    }

    private function order(array $extra): \Illuminate\Testing\TestResponse
    {
        return $this->withHeaders($this->tg())->postJson('/api/v1/tg/orders?company=oliyaviy', [
            'branch_id' => $this->branch->id, 'type' => 'delivery', 'items' => [['menu_item_id' => $this->item->id, 'quantity' => 1]],
        ] + $extra);
    }

    public function test_saved_addresses_home_from_registration_and_new_address_saved_with_label(): void
    {
        $list = $this->withHeaders($this->tg())->getJson('/api/v1/tg/addresses?company=oliyaviy')->assertOk()->json('data');
        $this->assertSame('Uy', $list[0]['label']);
        $this->assertEqualsWithDelta(40.9983, $list[0]['latitude'], 0.0001);

        // Yangi manzil shu buyurtma uchun, «Ish» nomi bilan saqlanadi
        $id = $this->order(['delivery_address' => 'Navoiy 5, 2-qavat', 'delivery_lat' => 41.0, 'delivery_lng' => 71.3, 'save_address' => true, 'address_label' => 'Ish'])
            ->assertCreated()->json('data.id');
        $this->assertSame('Navoiy 5, 2-qavat', Order::find($id)->delivery_address);

        $list = $this->withHeaders($this->tg())->getJson('/api/v1/tg/addresses?company=oliyaviy')->json('data');
        $this->assertSame(['Ish', 'Uy'], array_column($list, 'label'));

        // Saqlangan manzil tanlansa — uning nuqtasi buyurtmaga yoziladi
        $home = collect($list)->firstWhere('label', 'Uy');
        $id2 = $this->order(['address_id' => $home['id']])->assertCreated()->json('data.id');
        $this->assertEqualsWithDelta(40.9983, (float) Order::find($id2)->delivery_lat, 0.0001);

        // Begona manzil — rad
        $this->order(['address_id' => 99999])->assertStatus(422);

        // O'chirish
        $this->withHeaders($this->tg())->deleteJson("/api/v1/tg/addresses/{$home['id']}?company=oliyaviy")->assertOk();
        $this->assertCount(1, $this->withHeaders($this->tg())->getJson('/api/v1/tg/addresses?company=oliyaviy')->json('data'));
    }

    public function test_pending_order_hidden_from_kitchen_until_manager_confirms(): void
    {
        $id = $this->order([])->assertCreated()->assertJsonPath('data.status', 'pending')->json('data.id');

        $chef = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'Oshpaz', 'phone' => '+998900000003', 'role' => 'chef', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($chef);
        $this->assertCount(0, $this->getJson("/api/v1/orders?active=1&status=preparing,ready&branch_id={$this->branch->id}")->json('data'));
        $this->patchJson("/api/v1/orders/{$id}/status", ['status' => 'ready'])->assertStatus(422);
        $this->patchJson("/api/v1/orders/{$id}/confirm")->assertForbidden();

        Sanctum::actingAs($this->manager);
        $list = $this->getJson('/api/v1/orders/delivery')->assertOk()->json('data');
        $this->assertSame('pending', $list[0]['status']);
        $this->assertSame('+998901234567', $list[0]['customer']['phone']);

        $this->patchJson("/api/v1/orders/{$id}/confirm")->assertOk();
        $order = Order::find($id);
        $this->assertSame('preparing', $order->status);
        $this->assertSame($this->manager->id, $order->confirmed_by);

        Sanctum::actingAs($chef);
        $this->assertCount(1, $this->getJson("/api/v1/orders?active=1&status=preparing,ready&branch_id={$this->branch->id}")->json('data'));
    }

    public function test_manager_rejects_pending_order_without_time_limit(): void
    {
        $id = $this->order([])->json('data.id');
        Order::whereKey($id)->update(['created_at' => now()->subHours(3)]);

        Sanctum::actingAs($this->manager);
        $this->postJson("/api/v1/orders/{$id}/cancel", ['reason' => 'Mijoz javob bermadi'])->assertOk();
        $this->assertSame('cancelled', Order::find($id)->status);
    }

    public function test_staff_bot_bosses_get_confirm_request_and_chefs_only_after_confirm(): void
    {
        config(['services.telegram.staff_token' => '777:t']);
        $this->manager->forceFill(['telegram_id' => '9001'])->save();
        $chef = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'Oshpaz', 'phone' => '+998900000003', 'role' => 'chef', 'password' => 'secret123', 'is_active' => true, 'telegram_id' => null]);
        $chef->forceFill(['telegram_id' => '9002'])->save();

        $id = $this->order([])->json('data.id');
        $sent = fn () => collect(Http::recorded())->map(fn ($p) => $p[0]->data())->filter(fn ($d) => isset($d['chat_id']));
        $toManager = $sent()->firstWhere('chat_id', '9001');
        $this->assertStringContainsString('tasdiqlash kerak', $toManager['text']);
        $this->assertStringContainsString('+998 (90) 123-45-67', $toManager['text']);
        $this->assertNull($sent()->firstWhere('chat_id', '9002'));

        Sanctum::actingAs($this->manager);
        $this->patchJson("/api/v1/orders/{$id}/confirm")->assertOk();
        $this->assertNotNull($sent()->firstWhere('chat_id', '9002'));
    }
}
