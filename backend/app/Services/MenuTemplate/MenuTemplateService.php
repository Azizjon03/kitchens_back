<?php

namespace App\Services\MenuTemplate;

use App\Models\Addon;
use App\Models\Catalog\CatalogCategory;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;

/**
 * Global standart menyu katalogidan (super admin boshqaradi) kompaniyaga nusxa (#23).
 * Kompaniya keyin o'z nusxasini mustaqil tahrirlaydi — katalog o'zgarishi unga ta'sir qilmaydi.
 */
class MenuTemplateService
{
    public const TYPES = ['oshxona', 'fast_food', 'kafe', 'hammasi', 'bosh'];

    public function apply(Company $company, string $type): void
    {
        if ($type === 'bosh') {
            return;
        }

        $tops = CatalogCategory::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->with(['children' => fn ($q) => $q->where('is_active', true)->with([
                'items' => fn ($q) => $q->where('is_active', true),
                'addons' => fn ($q) => $q->where('is_active', true),
            ])])
            ->orderBy('sort_order')
            ->get();

        /** @var array<int, Addon> $addonCopies katalog addon id → kompaniya nusxasi */
        $addonCopies = [];
        $topSort = 0;

        foreach ($tops as $top) {
            $subs = $top->children->filter(fn (CatalogCategory $sub) => in_array($type, $sub->types ?? $top->types ?? [], true));
            if ($subs->isEmpty()) {
                continue;
            }

            $topCategory = Category::create([
                'company_id' => $company->id, 'name_uz' => $top->name_uz, 'name_ru' => $top->name_ru,
                'icon' => $top->icon, 'sort_order' => $topSort++, 'is_active' => true,
            ]);

            foreach ($subs->values() as $subSort => $sub) {
                $subCategory = Category::create([
                    'company_id' => $company->id, 'parent_id' => $topCategory->id,
                    'name_uz' => $sub->name_uz, 'name_ru' => $sub->name_ru,
                    'sort_order' => $subSort, 'is_active' => true,
                ]);

                $addonIds = $sub->addons->map(function ($catalogAddon) use (&$addonCopies, $company) {
                    return ($addonCopies[$catalogAddon->id] ??= Addon::create([
                        'company_id' => $company->id, 'name_uz' => $catalogAddon->name_uz,
                        'name_ru' => $catalogAddon->name_ru, 'price' => $catalogAddon->price, 'is_active' => true,
                    ]))->id;
                })->all();

                foreach ($sub->items as $item) {
                    // Vazn maydonlari faqat vaznli taomda — porsiyalida jadval standart qiymati qoladi
                    $menuItem = MenuItem::create(array_filter([
                        'company_id' => $company->id, 'category_id' => $subCategory->id,
                        'name_uz' => $item->name_uz, 'name_ru' => $item->name_ru,
                        'sell_type' => $item->sell_type, 'price' => $item->price,
                        'min_weight' => $item->min_weight, 'weight_step' => $item->weight_step,
                        'sort_order' => $item->sort_order, 'is_available' => true,
                    ], fn ($v) => $v !== null));

                    if ($addonIds) {
                        $menuItem->addons()->attach($addonIds);
                    }
                }
            }
        }
    }
}
