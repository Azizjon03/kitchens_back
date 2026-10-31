<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Catalog\CatalogCategory;
use App\Models\Catalog\CatalogItem;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #29: restoran menyuga qo'shishda avval standart katalogdan tanlaydi; tanlangani
 * kerakli kategoriya/sub-menyu bilan birga nusxalanadi, takrorlanmaydi.
 */
class CatalogImportTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;

    private function actingAsRole(string $role = 'company_admin'): User
    {
        $this->company ??= Company::create(['name' => 'Eski', 'slug' => 'eski', 'phone' => '+998700000000', 'is_active' => true]);
        $branch = Branch::firstOrCreate(['company_id' => $this->company->id, 'name' => 'Asosiy filial'], ['is_active' => true]);
        $user = User::create([
            'company_id' => $this->company->id, 'branch_id' => $role === 'company_admin' ? null : $branch->id,
            'name' => $role, 'phone' => '+99890'.random_int(1000000, 9999999), 'role' => $role, 'password' => 'secret123', 'is_active' => true,
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function item(string $name): CatalogItem
    {
        return CatalogItem::where('name_uz', $name)->firstOrFail();
    }

    public function test_company_sees_catalog_with_added_flags(): void
    {
        $this->actingAsRole();

        $res = $this->getJson('/api/v1/menu/catalog')->assertOk();
        $this->assertCount(7, $res->json('data.categories'));
        $first = $res->json('data.categories.0.children.0.items.0');
        $this->assertFalse($first['added']);
        $this->assertArrayHasKey('price', $first);
    }

    public function test_importing_items_creates_missing_categories_and_attaches_osh_addons(): void
    {
        $this->actingAsRole();
        $osh = $this->item("Osh (to'y oshi)");
        $cola = $this->item('Coca-Cola 0.5 l');

        $this->postJson('/api/v1/menu/catalog/import', ['item_ids' => [$osh->id, $cola->id]])
            ->assertOk()
            ->assertJsonPath('data.items_added', 2)
            ->assertJsonPath('data.categories_added', 4);

        $palov = Category::withoutGlobalScopes()->where('company_id', $this->company->id)->where('name_uz', 'Palov')->firstOrFail();
        $this->assertSame('Milliy taomlar', Category::withoutGlobalScopes()->find($palov->parent_id)->name_uz);

        $menuOsh = MenuItem::withoutGlobalScopes()->where('company_id', $this->company->id)->where('catalog_item_id', $osh->id)->firstOrFail();
        $this->assertSame($palov->id, $menuOsh->category_id);
        $this->assertEquals(27000, (float) $menuOsh->price);
        $this->assertCount(6, $menuOsh->addons()->withoutGlobalScopes()->get());

        $this->getJson('/api/v1/menu/catalog')->assertOk();
        $flags = collect($this->getJson('/api/v1/menu/catalog')->json('data.categories'))
            ->flatMap(fn ($c) => $c['children'])->flatMap(fn ($s) => $s['items'])->where('added', true)->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$osh->id, $cola->id], $flags);
    }

    public function test_reimport_does_not_duplicate_and_reuses_categories(): void
    {
        $this->actingAsRole();
        $osh = $this->item("Osh (to'y oshi)");
        $half = $this->item('Osh — yarim porsiya');
        $this->postJson('/api/v1/menu/catalog/import', ['item_ids' => [$osh->id]])->assertOk();

        $this->postJson('/api/v1/menu/catalog/import', ['item_ids' => [$osh->id, $half->id]])
            ->assertOk()->assertJsonPath('data.items_added', 1)->assertJsonPath('data.categories_added', 0);

        $this->assertSame(1, MenuItem::withoutGlobalScopes()->where('company_id', $this->company->id)->where('catalog_item_id', $osh->id)->count());
        $this->assertSame(1, Category::withoutGlobalScopes()->where('company_id', $this->company->id)->where('name_uz', 'Palov')->count());
        $this->assertSame(6, \App\Models\Addon::withoutGlobalScopes()->where('company_id', $this->company->id)->count(), "Qo'shimchalar ham takrorlanmaydi");
    }

    public function test_importing_a_submenu_with_or_without_items(): void
    {
        $this->actingAsRole();
        $gazsiz = CatalogCategory::where('name_uz', 'Gazsiz suv')->firstOrFail();
        $gazli = CatalogCategory::where('name_uz', 'Gazli suv')->firstOrFail();

        $this->postJson('/api/v1/menu/catalog/import', ['category_ids' => [$gazsiz->id], 'with_items' => true])
            ->assertOk()->assertJsonPath('data.items_added', $gazsiz->items()->count());

        $this->postJson('/api/v1/menu/catalog/import', ['category_ids' => [$gazli->id], 'with_items' => false])
            ->assertOk()->assertJsonPath('data.items_added', 0)->assertJsonPath('data.categories_added', 1);
        $this->assertSame(1, Category::withoutGlobalScopes()->where('company_id', $this->company->id)->where('name_uz', 'Suvlar')->count());

        $suvlar = collect($this->getJson('/api/v1/menu/catalog')->json('data.categories'))->firstWhere('name_uz', 'Suvlar');
        $this->assertTrue($suvlar['added']);
        $this->assertTrue(collect($suvlar['children'])->firstWhere('name_uz', 'Gazli suv')['added']);
        $this->assertFalse(collect($suvlar['children'])->firstWhere('name_uz', 'Mineral suv')['added']);
    }

    public function test_company_created_with_template_shows_items_as_added(): void
    {
        $this->company = Company::create(['name' => 'Yangi', 'slug' => 'yangi', 'phone' => '+998700000000', 'is_active' => true]);
        app(\App\Services\MenuTemplate\MenuTemplateService::class)->apply($this->company, 'kafe');
        $this->actingAsRole();

        $added = collect($this->getJson('/api/v1/menu/catalog')->json('data.categories'))
            ->flatMap(fn ($c) => $c['children'])->flatMap(fn ($s) => $s['items'])->where('added', true)->count();
        $this->assertSame(MenuItem::withoutGlobalScopes()->where('company_id', $this->company->id)->count(), $added);
    }

    public function test_roles_and_validation(): void
    {
        $this->actingAsRole('manager');
        $this->postJson('/api/v1/menu/catalog/import', ['item_ids' => [$this->item('Mastava')->id]])->assertOk();

        $this->postJson('/api/v1/menu/catalog/import', ['item_ids' => [999999]])
            ->assertStatus(422)->assertJsonValidationErrors('item_ids.0');
        $this->postJson('/api/v1/menu/catalog/import', [])->assertStatus(422);

        $this->actingAsRole('waiter');
        $this->getJson('/api/v1/menu/catalog')->assertForbidden();
    }
}
