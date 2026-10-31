<?php

namespace App\Services\MenuTemplate;

use App\Services\Media\ImageStore;
use App\Models\Addon;
use App\Models\Catalog\CatalogCategory;
use App\Models\Catalog\CatalogItem;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Global standart menyu katalogidan (super admin boshqaradi) kompaniyaga nusxa.
 * - apply(): kompaniya ochilganda restoran turi bo'yicha (#23)
 * - import(): restoran istalgan vaqtda katalogdan tanlab qo'shadi (#29)
 * Nusxalar katalogga bog'lanadi (catalog_*_id) — takror qo'shilmaydi; restoran nusxasini
 * mustaqil tahrirlaydi, katalog o'zgarishi unga ta'sir qilmaydi.
 */
class MenuTemplateService
{
    public const TYPES = ['oshxona', 'fast_food', 'kafe', 'hammasi', 'bosh'];

    private int $categoriesAdded = 0;

    private int $itemsAdded = 0;

    public function apply(Company $company, string $type): void
    {
        if ($type === 'bosh') {
            return;
        }

        $subIds = CatalogCategory::query()
            ->whereNotNull('parent_id')
            ->where('is_active', true)
            ->whereHas('parent', fn ($q) => $q->where('is_active', true))
            ->with('parent')
            ->get()
            ->filter(fn (CatalogCategory $sub) => in_array($type, $sub->types ?? $sub->parent->types ?? [], true))
            ->pluck('id')
            ->all();

        $this->import($company, [], $subIds, true);
    }

    /**
     * @param  int[]  $itemIds  katalog taomlari
     * @param  int[]  $categoryIds  katalog kategoriyalari yoki sub-menyulari
     * @return array{items_added:int, categories_added:int}
     */
    public function import(Company $company, array $itemIds, array $categoryIds, bool $withItems = true): array
    {
        $this->categoriesAdded = 0;
        $this->itemsAdded = 0;

        DB::transaction(function () use ($company, $itemIds, $categoryIds, $withItems) {
            $categories = CatalogCategory::with(['parent', 'children' => fn ($q) => $q->where('is_active', true)])
                ->whereIn('id', $categoryIds)->where('is_active', true)->get()
                // Katalogdagi tartib: avval kategoriya, so'ng uning ichidagi sub-menyu
                ->sortBy(fn (CatalogCategory $c) => $c->parent_id === null
                    ? [$c->sort_order, -1]
                    : [$c->parent->sort_order, $c->sort_order]);

            $items = CatalogItem::with('category.parent')->whereIn('id', $itemIds)->where('is_active', true)->get();

            foreach ($categories as $category) {
                $subs = $category->parent_id === null ? $category->children : collect([$category]);
                if ($category->parent_id === null) {
                    $this->ensureTop($company, $category);
                }
                foreach ($subs as $sub) {
                    $this->ensureSub($company, $sub->loadMissing('parent'));
                    if ($withItems) {
                        $items = $items->merge($sub->items()->where('is_active', true)->with('category.parent')->get());
                    }
                }
            }

            foreach ($items->unique('id')->sortBy([['category.parent.sort_order', 'asc'], ['category.sort_order', 'asc'], ['sort_order', 'asc']]) as $item) {
                $this->importItem($company, $item);
            }
        });

        return ['items_added' => $this->itemsAdded, 'categories_added' => $this->categoriesAdded];
    }

    private function ensureTop(Company $company, CatalogCategory $top): Category
    {
        $existing = Category::withoutGlobalScopes()->where('company_id', $company->id)->where('catalog_category_id', $top->id)->first();
        if ($existing) {
            return $existing;
        }

        $this->categoriesAdded++;

        return Category::create([
            'company_id' => $company->id, 'catalog_category_id' => $top->id,
            'name_uz' => $top->name_uz, 'name_ru' => $top->name_ru, 'icon' => $top->icon,
            'sort_order' => $this->nextSort($company, null), 'is_active' => true,
        ]);
    }

    private function ensureSub(Company $company, CatalogCategory $sub): Category
    {
        $existing = Category::withoutGlobalScopes()->where('company_id', $company->id)->where('catalog_category_id', $sub->id)->first();
        if ($existing) {
            return $existing;
        }

        $parent = $this->ensureTop($company, $sub->parent);
        $this->categoriesAdded++;

        return Category::create([
            'company_id' => $company->id, 'parent_id' => $parent->id, 'catalog_category_id' => $sub->id,
            'name_uz' => $sub->name_uz, 'name_ru' => $sub->name_ru,
            'sort_order' => $this->nextSort($company, $parent->id), 'is_active' => true,
        ]);
    }

    private function importItem(Company $company, CatalogItem $item): void
    {
        $exists = MenuItem::withoutGlobalScopes()->where('company_id', $company->id)->where('catalog_item_id', $item->id)->exists();
        if ($exists) {
            return;
        }

        $sub = $this->ensureSub($company, $item->category);

        // Vazn maydonlari faqat vaznli taomda — porsiyalida jadval standart qiymati qoladi
        $menuItem = MenuItem::create(array_filter([
            'company_id' => $company->id, 'category_id' => $sub->id, 'catalog_item_id' => $item->id,
            'name_uz' => $item->name_uz, 'name_ru' => $item->name_ru,
            'sell_type' => $item->sell_type, 'price' => $item->price,
            'min_weight' => $item->min_weight, 'weight_step' => $item->weight_step,
            'sort_order' => $item->sort_order, 'is_available' => true,
            // #35: katalog rasmi restoranning o'z nusxasiga ko'chiriladi (katalog rasmi almashsa ham buzilmaydi)
            'image' => $item->image ? app(ImageStore::class)->copy($item->image, "menu/{$company->id}") : null,
        ], fn ($v) => $v !== null));
        $this->itemsAdded++;

        $addonIds = $this->addonsFor($company, $item->category);
        if ($addonIds) {
            $menuItem->addons()->attach($addonIds);
        }
    }

    /** Sub-menyuga biriktirilgan katalog qo'shimchalarining kompaniyadagi nusxalari (bir marta yaratiladi) */
    private function addonsFor(Company $company, CatalogCategory $sub): array
    {
        return $sub->addons()->where('is_active', true)->get()->map(function ($catalogAddon) use ($company) {
            return Addon::withoutGlobalScopes()->firstOrCreate(
                ['company_id' => $company->id, 'catalog_addon_id' => $catalogAddon->id],
                ['name_uz' => $catalogAddon->name_uz, 'name_ru' => $catalogAddon->name_ru, 'price' => $catalogAddon->price, 'is_active' => true],
            )->id;
        })->all();
    }

    private function nextSort(Company $company, ?int $parentId): int
    {
        return (int) Category::withoutGlobalScopes()->where('company_id', $company->id)->where('parent_id', $parentId)->max('sort_order') + 1;
    }

    /** Kompaniyada allaqachon bor katalog taomlari id'lari */
    public function addedItemIds(Company $company): Collection
    {
        return MenuItem::withoutGlobalScopes()->where('company_id', $company->id)->whereNotNull('catalog_item_id')->pluck('catalog_item_id');
    }
}
