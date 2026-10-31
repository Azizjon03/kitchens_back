<?php

namespace Tests\Feature;

use App\Models\Catalog\CatalogAddon;
use App\Models\Catalog\CatalogCategory;
use App\Models\Catalog\CatalogItem;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** #23: standart menyu katalogi — faqat super admin ko'radi va tahrirlaydi. */
class CatalogAdminTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): void
    {
        Sanctum::actingAs(User::create(['name' => 'S', 'phone' => '+998906921469', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true]));
    }

    public function test_super_admin_sees_the_seeded_catalog_tree(): void
    {
        $this->superAdmin();

        $res = $this->getJson('/api/v1/super/catalog')->assertOk();

        $tops = collect($res->json('data.categories'));
        $this->assertCount(7, $tops);
        $suvlar = $tops->firstWhere('name_uz', 'Suvlar');
        $this->assertSame(['Gazsiz suv', 'Gazli suv', 'Mineral suv', "Ta'mli gazli suv (Flavis)"], collect($suvlar['children'])->pluck('name_uz')->all());
        $this->assertNotEmpty($suvlar['children'][0]['items']);
        $this->assertCount(6, $res->json('data.addons'));
    }

    public function test_company_admin_cannot_access_the_catalog(): void
    {
        $company = Company::create(['name' => 'A', 'slug' => 'a', 'phone' => '+998700000000', 'is_active' => true]);
        Sanctum::actingAs(User::create(['company_id' => $company->id, 'name' => 'Rahbar', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]));

        $this->getJson('/api/v1/super/catalog')->assertForbidden();
        $this->postJson('/api/v1/super/catalog/items', [])->assertForbidden();
    }

    public function test_super_admin_adds_edits_and_removes_a_water(): void
    {
        $this->superAdmin();
        $gazli = CatalogCategory::where('name_uz', 'Gazli suv')->firstOrFail();

        $created = $this->postJson('/api/v1/super/catalog/items', [
            'catalog_category_id' => $gazli->id, 'name_uz' => 'Toshkent suvi gazli 0.5 l', 'name_ru' => 'Ташкентская вода газ. 0.5 л', 'price' => 4500,
        ])->assertCreated();
        $id = $created->json('data.id');

        $this->putJson("/api/v1/super/catalog/items/{$id}", ['price' => 5000])->assertOk()->assertJsonPath('data.price', '5000.00');
        $this->deleteJson("/api/v1/super/catalog/items/{$id}")->assertOk();
        $this->assertNull(CatalogItem::find($id));
    }

    public function test_items_live_only_in_submenus_and_submenus_only_two_levels(): void
    {
        $this->superAdmin();
        $top = CatalogCategory::where('name_uz', 'Suvlar')->firstOrFail();
        $sub = CatalogCategory::where('name_uz', 'Gazli suv')->firstOrFail();

        $this->postJson('/api/v1/super/catalog/items', ['catalog_category_id' => $top->id, 'name_uz' => 'X', 'name_ru' => 'X', 'price' => 1000])
            ->assertStatus(422)->assertJsonValidationErrors('catalog_category_id');

        $this->postJson('/api/v1/super/catalog/categories', ['name_uz' => 'Chuqur', 'name_ru' => 'Глубоко', 'parent_id' => $sub->id])
            ->assertStatus(422)->assertJsonValidationErrors('parent_id');

        $this->postJson('/api/v1/super/catalog/categories', ['name_uz' => 'Pivo emas', 'name_ru' => 'X', 'types' => ['restoran']])
            ->assertStatus(422)->assertJsonValidationErrors('types.0');
    }

    public function test_new_category_with_submenu_reaches_new_companies_of_that_type(): void
    {
        $this->superAdmin();
        $top = $this->postJson('/api/v1/super/catalog/categories', ['name_uz' => 'Grill', 'name_ru' => 'Гриль', 'types' => ['fast_food']])->assertCreated();
        $sub = $this->postJson('/api/v1/super/catalog/categories', ['name_uz' => 'Tovuq grill', 'name_ru' => 'Курица гриль', 'parent_id' => $top->json('data.id')])->assertCreated();
        $this->postJson('/api/v1/super/catalog/items', ['catalog_category_id' => $sub->json('data.id'), 'name_uz' => 'Butun tovuq', 'name_ru' => 'Целая курица', 'price' => 85000])->assertCreated();

        $res = $this->getJson('/api/v1/super/catalog')->assertOk();
        $this->assertNotNull(collect($res->json('data.categories'))->firstWhere('name_uz', 'Grill'));
    }

    public function test_deleting_a_category_removes_its_submenus_and_items(): void
    {
        $this->superAdmin();
        $top = CatalogCategory::where('name_uz', 'Kafe')->firstOrFail();
        $subIds = $top->children()->pluck('id');

        $this->deleteJson("/api/v1/super/catalog/categories/{$top->id}")->assertOk();

        $this->assertSame(0, CatalogCategory::whereIn('id', $subIds)->count());
        $this->assertSame(0, CatalogItem::whereIn('catalog_category_id', $subIds)->count());
    }

    public function test_addon_targets_can_be_changed(): void
    {
        $this->superAdmin();
        $kabob = CatalogCategory::where('name_uz', 'Kaboblar')->firstOrFail();
        $addon = CatalogAddon::where('name_uz', 'Limon (bo\'lak)')->firstOrFail();

        $this->putJson("/api/v1/super/catalog/addons/{$addon->id}", ['category_ids' => [$kabob->id]])
            ->assertOk()->assertJsonPath('data.category_ids', [$kabob->id]);
    }
}
