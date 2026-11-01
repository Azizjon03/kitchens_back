<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\KitchenStation;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #40: oshxona bo'limlari — har oshpaz o'z bo'limi taomlarini tayyorlaydi; barcha
 * bo'limlar tayyor bo'lganda buyurtma «ready».
 */
class KitchenStationTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private User $admin;
    private User $kabobChef;
    private User $oshChef;
    private Category $kabobCat;
    private Category $oshCat;
    private MenuItem $kabob;
    private MenuItem $osh;
    private MenuItem $non;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake(fn (HttpRequest $r) => Http::response(['ok' => true, 'result' => ['message_id' => 1]]));
        $this->company = Company::create(['name' => 'Oliyaviy', 'slug' => 'oliyaviy', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $mk = fn ($role, $phone) => User::create(['company_id' => $this->company->id, 'branch_id' => $role === 'company_admin' ? null : $this->branch->id, 'name' => $role.$phone, 'phone' => $phone, 'role' => $role, 'password' => 'secret123', 'is_active' => true]);
        $this->admin = $mk('company_admin', '+998900000001');
        $this->kabobChef = $mk('chef', '+998900000002');
        $this->oshChef = $mk('chef', '+998900000003');

        $this->kabobCat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Kaboblar', 'is_active' => true]);
        $this->oshCat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Milliy taomlar', 'is_active' => true]);
        $item = fn ($cat, $name) => MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => $name, 'price' => 20000, 'is_available' => true]);
        $this->kabob = $item($this->kabobCat, 'Jaz kabob');
        $this->osh = $item($this->oshCat, 'Osh');
        $this->non = $item($this->oshCat, 'Non');
    }

    /** @return array{0: KitchenStation, 1: KitchenStation} */
    private function stations(): array
    {
        Sanctum::actingAs($this->admin);
        $kabob = $this->postJson('/api/v1/kitchen-stations', ['name' => 'Kabob', 'category_ids' => [$this->kabobCat->id], 'user_ids' => [$this->kabobChef->id]])->assertCreated()->json('data.id');
        $osh = $this->postJson('/api/v1/kitchen-stations', ['name' => 'Oshxona ichi', 'category_ids' => [$this->oshCat->id], 'user_ids' => [$this->oshChef->id]])->assertCreated()->json('data.id');
        // Non tandirda — kabob bo'limida (taom darajasida istisno)
        $this->putJson("/api/v1/menu-items/{$this->non->id}", ['kitchen_station_id' => $kabob])->assertOk();

        return [KitchenStation::find($kabob), KitchenStation::find($osh)];
    }

    private function order(): Order
    {
        $table = Table::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'number' => '3', 'seats' => 4, 'status' => 'free']);
        Sanctum::actingAs($this->admin);
        $id = $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'branch_id' => $this->branch->id, 'table_id' => $table->id, 'items' => [
            ['menu_item_id' => $this->kabob->id, 'quantity' => 2],
            ['menu_item_id' => $this->osh->id, 'quantity' => 1],
            ['menu_item_id' => $this->non->id, 'quantity' => 1],
        ]])->assertCreated()->json('data.id');

        return Order::withoutGlobalScopes()->findOrFail($id);
    }

    public function test_admin_manages_stations_with_categories_and_chefs(): void
    {
        [$kabob] = $this->stations();

        $list = $this->getJson('/api/v1/kitchen-stations')->assertOk()->json('data');
        $this->assertSame(['Kabob', 'Oshxona ichi'], array_column($list, 'name'));
        $this->assertSame([$this->kabobChef->id], array_column($list[0]['users'], 'id'));
        $this->assertSame($kabob->id, $this->kabobCat->fresh()->kitchen_station_id);

        // Nom takrorlanmaydi, begona xodim yoki ofitsiant biriktirilmaydi
        $this->postJson('/api/v1/kitchen-stations', ['name' => 'Kabob'])->assertStatus(422);
        $waiter = User::create(['company_id' => $this->company->id, 'name' => 'W', 'phone' => '+998900000009', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        $this->putJson("/api/v1/kitchen-stations/{$kabob->id}", ['user_ids' => [$waiter->id]])->assertStatus(422);

        // Kategoriyani olib tashlash bog'lanishni uzadi
        $this->putJson("/api/v1/kitchen-stations/{$kabob->id}", ['category_ids' => []])->assertOk();
        $this->assertNull($this->kabobCat->fresh()->kitchen_station_id);

        // Menejer oshpazlar ro'yxatini oladi (faqat oshpazlar)
        $manager = User::create(['company_id' => $this->company->id, 'name' => 'M', 'phone' => '+998900000008', 'role' => 'manager', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($manager);
        $this->assertEqualsCanonicalizing([$this->kabobChef->id, $this->oshChef->id], array_column($this->getJson('/api/v1/kitchen-stations/chefs')->assertOk()->json('data'), 'id'));

        // Oshpaz ro'yxatni ko'radi, lekin o'zgartira olmaydi
        Sanctum::actingAs($this->kabobChef);
        $this->getJson('/api/v1/kitchen-stations')->assertOk();
        $this->postJson('/api/v1/kitchen-stations', ['name' => 'X'])->assertForbidden();
    }

    public function test_each_chef_marks_own_station_and_order_is_ready_when_all_done(): void
    {
        [$kabob, $osh] = $this->stations();
        $order = $this->order();

        $items = collect($order->orderItems()->get())->keyBy('menu_item_id');
        $this->assertSame($kabob->id, $items[$this->kabob->id]->kitchen_station_id);
        $this->assertSame($osh->id, $items[$this->osh->id]->kitchen_station_id);
        $this->assertSame($kabob->id, $items[$this->non->id]->kitchen_station_id);

        // Kabobchi — boshqa bo'limni belgilay olmaydi
        Sanctum::actingAs($this->kabobChef);
        $this->patchJson("/api/v1/orders/{$order->id}/kitchen-ready", ['station_id' => $osh->id])->assertForbidden();

        $res = $this->patchJson("/api/v1/orders/{$order->id}/kitchen-ready")->assertOk();
        $this->assertSame('preparing', $res->json('data.status'));
        $ready = collect($res->json('data.items'))->filter(fn ($i) => $i['ready_at'] !== null)->pluck('name_uz')->sort()->values()->all();
        $this->assertSame(['Jaz kabob', 'Non'], $ready);

        // Eski "status" so'rovi ham faqat o'z qismini belgilaydi
        Sanctum::actingAs($this->oshChef);
        $this->patchJson("/api/v1/orders/{$order->id}/status", ['status' => 'ready'])->assertOk()->assertJsonPath('data.status', 'ready');
        $this->assertSame('ready', $order->fresh()->status);

        $this->patchJson("/api/v1/orders/{$order->id}/kitchen-ready")->assertStatus(422);
    }

    public function test_chef_without_stations_and_restaurant_without_stations_work_as_before(): void
    {
        $order = $this->order();
        $this->assertNull($order->orderItems()->first()->kitchen_station_id);

        Sanctum::actingAs($this->kabobChef);
        $this->patchJson("/api/v1/orders/{$order->id}/status", ['status' => 'ready'])->assertOk();
        $this->assertSame('ready', $order->fresh()->status);
        $this->assertSame(0, $order->orderItems()->whereNull('ready_at')->count());
    }

    public function test_foreign_company_station_cannot_be_used(): void
    {
        $other = Company::create(['name' => 'B', 'slug' => 'b', 'phone' => '+998700000001', 'is_active' => true]);
        $foreign = KitchenStation::create(['company_id' => $other->id, 'name' => 'Begona']);
        Sanctum::actingAs($this->admin);
        $this->putJson("/api/v1/menu-items/{$this->osh->id}", ['kitchen_station_id' => $foreign->id])->assertStatus(422);
        $this->putJson("/api/v1/kitchen-stations/{$foreign->id}", ['name' => 'X'])->assertNotFound();
    }

    public function test_staff_bot_sends_each_chef_only_own_items_and_ready_button_marks_own_part(): void
    {
        config(['services.telegram.staff_token' => '777:t', 'services.telegram.frontend_url' => 'https://kitchens.uz']);
        [$kabob] = $this->stations();
        $this->kabobChef->forceFill(['telegram_id' => '5001'])->save();
        $this->oshChef->forceFill(['telegram_id' => '5002'])->save();
        $order = $this->order();

        $sent = collect(Http::recorded())->map(fn ($p) => $p[0]->data())->filter(fn ($d) => isset($d['chat_id']));
        $toKabob = $sent->firstWhere('chat_id', '5001')['text'];
        $toOsh = $sent->firstWhere('chat_id', '5002')['text'];
        $this->assertStringContainsString('Jaz kabob', $toKabob);
        $this->assertStringContainsString('Non', $toKabob);
        $this->assertStringNotContainsString('Osh', $toKabob);
        $this->assertStringContainsString('Osh', $toOsh);
        $this->assertStringNotContainsString('kabob', $toOsh);

        $secret = substr(hash_hmac('sha256', 'staff-webhook', '777:t'), 0, 48);
        $this->withHeaders(['X-Telegram-Bot-Api-Secret-Token' => $secret])
            ->postJson('/api/v1/telegram/staff-webhook', ['update_id' => 1, 'callback_query' => ['id' => 'c', 'from' => ['id' => 5001], 'data' => "ready:{$order->id}"]])->assertOk();
        $this->assertSame('preparing', $order->fresh()->status);
        $this->assertSame(0, $order->orderItems()->where('kitchen_station_id', $kabob->id)->whereNull('ready_at')->count());

        $this->withHeaders(['X-Telegram-Bot-Api-Secret-Token' => $secret])
            ->postJson('/api/v1/telegram/staff-webhook', ['update_id' => 2, 'callback_query' => ['id' => 'd', 'from' => ['id' => 5002], 'data' => "ready:{$order->id}"]])->assertOk();
        $this->assertSame('ready', $order->fresh()->status);
    }
}
