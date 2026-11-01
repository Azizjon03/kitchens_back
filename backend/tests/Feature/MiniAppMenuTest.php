<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Branch;
use App\Models\Catalog\CatalogItem;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #35: qo'shimcha soni (oshga 2× go'sht) va taom rasmlari.
 */
class MiniAppMenuTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private MenuItem $osh;
    private Addon $gosht;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config(['app.debug' => true]);
        $this->company = Company::create(['name' => 'Oliyaviy', 'slug' => 'oliyaviy', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $cat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Palov', 'is_active' => true]);
        $this->osh = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => 'Osh', 'sell_type' => 'portion', 'price' => 30000, 'is_available' => true]);
        $this->gosht = Addon::create(['company_id' => $this->company->id, 'name_uz' => "Go'sht", 'price' => 12000, 'is_active' => true, 'max_quantity' => 3]);
        $this->osh->addons()->attach($this->gosht->id);
    }

    private function tgOrder(array $line): \Illuminate\Testing\TestResponse
    {
        return $this->withHeaders(['X-Telegram-Dev-Id' => '555'])->postJson('/api/v1/tg/orders?company=oliyaviy', [
            'branch_id' => $this->branch->id, 'items' => [$line + ['menu_item_id' => $this->osh->id]],
        ]);
    }

    public function test_addon_quantity_is_priced_and_stored(): void
    {
        $id = $this->tgOrder(['quantity' => 2, 'addons' => [['id' => $this->gosht->id, 'quantity' => 2]]])->assertCreated()->json('data.id');

        // 2 porsiya × (30 000 + 2 × 12 000)
        $this->assertEquals(2 * (30000 + 2 * 12000), (float) Order::find($id)->total);
        $this->assertSame(2, (int) DB::table('order_item_addons')->value('quantity'));
    }

    public function test_legacy_addon_ids_still_count_as_one(): void
    {
        $id = $this->tgOrder(['quantity' => 1, 'addon_ids' => [$this->gosht->id]])->assertCreated()->json('data.id');

        $this->assertEquals(42000, (float) Order::find($id)->total);
        $this->assertSame(1, (int) DB::table('order_item_addons')->value('quantity'));
    }

    public function test_addon_quantity_over_max_is_rejected(): void
    {
        $this->tgOrder(['quantity' => 1, 'addons' => [['id' => $this->gosht->id, 'quantity' => 4]]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.addons');
        $this->assertSame(0, Order::withoutGlobalScopes()->count());
    }

    public function test_staff_order_shows_addon_quantity(): void
    {
        $waiter = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'O', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($waiter);

        $id = $this->postJson('/api/v1/orders', ['type' => 'takeaway', 'branch_id' => $this->branch->id, 'items' => [
            ['menu_item_id' => $this->osh->id, 'quantity' => 1, 'addons' => [['id' => $this->gosht->id, 'quantity' => 3]]],
        ]])->assertCreated()->json('data.id');

        $this->getJson("/api/v1/orders/{$id}")->assertOk()
            ->assertJsonPath('data.order_items.0.addons.0.pivot.quantity', 3);
    }

    public function test_admin_uploads_replaces_and_deletes_menu_item_image(): void
    {
        $admin = User::create(['company_id' => $this->company->id, 'name' => 'R', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($admin);

        $first = $this->post("/api/v1/menu-items/{$this->osh->id}/image", ['image' => UploadedFile::fake()->image('osh.png', 1600, 1200)], ['Accept' => 'application/json'])
            ->assertOk()->json('data.image');
        $this->assertMatchesRegularExpression('#^/api/v1/media/menu/'.$this->company->id.'/[0-9a-f-]+\.(webp|png)$#', $first);
        $disk = substr($first, strlen('/api/v1/'));
        Storage::disk('local')->assertExists($disk);
        [$w] = getimagesizefromstring(Storage::disk('local')->get($disk));
        $this->assertSame(900, $w, 'Katta rasm 900px gacha kichraytiriladi');

        // Ommaviy berish — uzoq kesh bilan
        $this->get($first)->assertOk()->assertHeader('Cache-Control', 'immutable, max-age=31536000, public');

        $second = $this->post("/api/v1/menu-items/{$this->osh->id}/image", ['image' => UploadedFile::fake()->image('yangi.png', 400, 400)], ['Accept' => 'application/json'])->json('data.image');
        Storage::disk('local')->assertMissing($disk);

        $this->deleteJson("/api/v1/menu-items/{$this->osh->id}/image")->assertOk()->assertJsonPath('data.image', null);
        Storage::disk('local')->assertMissing(substr($second, strlen('/api/v1/')));

        $this->post("/api/v1/menu-items/{$this->osh->id}/image", ['image' => UploadedFile::fake()->create('virus.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('image');
    }

    public function test_foreign_company_item_image_cannot_be_changed_and_media_path_is_safe(): void
    {
        $other = Company::create(['name' => 'B', 'slug' => 'b', 'phone' => '+998700000009', 'is_active' => true]);
        Sanctum::actingAs(User::create(['company_id' => $other->id, 'name' => 'B', 'phone' => '+998900000009', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]));

        $this->post("/api/v1/menu-items/{$this->osh->id}/image", ['image' => UploadedFile::fake()->image('x.png')], ['Accept' => 'application/json'])->assertNotFound();
        $this->get('/api/v1/media/../.env')->assertNotFound();
        $this->get('/api/v1/media/menu/1/yoq.webp')->assertNotFound();
    }

    public function test_catalog_image_is_copied_to_restaurant_on_import(): void
    {
        Sanctum::actingAs(User::create(['name' => 'S', 'phone' => '+998906921469', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true]));
        $item = CatalogItem::where('name_uz', 'Mastava')->firstOrFail();
        $catalogImage = $this->post("/api/v1/super/catalog/items/{$item->id}/image", ['image' => UploadedFile::fake()->image('mastava.png', 300, 300)], ['Accept' => 'application/json'])
            ->assertOk()->json('data.image');

        Sanctum::actingAs(User::create(['company_id' => $this->company->id, 'name' => 'R', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]));
        $this->postJson('/api/v1/menu/catalog/import', ['item_ids' => [$item->id]])->assertOk();

        $menuImage = MenuItem::withoutGlobalScopes()->where('catalog_item_id', $item->id)->value('image');
        $this->assertNotNull($menuImage);
        $this->assertNotSame($catalogImage, $menuImage, 'Restoranning o\'z nusxasi');
        Storage::disk('local')->assertExists(substr($menuImage, strlen('/api/v1/')));

        // Mini App menyusida rasm va qo'shimcha cheklovi bor
        $menu = $this->withHeaders(['X-Telegram-Dev-Id' => '555'])->getJson('/api/v1/tg/menu?company=oliyaviy')->assertOk();
        $this->assertStringContainsString('"image":"\/api\/v1\/media\/menu', $menu->getContent());
        $this->assertStringContainsString('"max_quantity":3', $menu->getContent());
    }
}
