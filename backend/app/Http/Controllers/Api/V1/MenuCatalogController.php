<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Catalog\CatalogCategory;
use App\Services\MenuTemplate\MenuTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** #29: restoran menyusiga standart katalogdan tanlab qo'shish (admin, menejer). */
class MenuCatalogController extends Controller
{
    use ApiResponse;

    public function index(Request $request, MenuTemplateService $service): JsonResponse
    {
        $added = $service->addedItemIds($request->user()->company)->flip();
        $addedCategories = \App\Models\Category::withoutGlobalScopes()
            ->where('company_id', $request->user()->company_id)
            ->whereNotNull('catalog_category_id')->pluck('catalog_category_id')->flip();

        $categories = CatalogCategory::whereNull('parent_id')->where('is_active', true)
            ->with(['children' => fn ($q) => $q->where('is_active', true)->with([
                'items' => fn ($q) => $q->where('is_active', true),
            ])])
            ->orderBy('sort_order')->get()
            ->map(fn (CatalogCategory $top) => [
                'id' => $top->id, 'name_uz' => $top->name_uz, 'name_ru' => $top->name_ru, 'icon' => $top->icon,
                'added' => $addedCategories->has($top->id),
                'children' => $top->children->map(fn (CatalogCategory $sub) => [
                    'id' => $sub->id, 'name_uz' => $sub->name_uz, 'name_ru' => $sub->name_ru,
                    'added' => $addedCategories->has($sub->id),
                    'items' => $sub->items->map(fn ($i) => [
                        'id' => $i->id, 'name_uz' => $i->name_uz, 'name_ru' => $i->name_ru,
                        'sell_type' => $i->sell_type, 'price' => $i->price, 'min_weight' => $i->min_weight,
                        'added' => $added->has($i->id),
                    ])->values(),
                ])->values(),
            ])->values();

        return $this->success(['categories' => $categories]);
    }

    public function import(Request $request, MenuTemplateService $service): JsonResponse
    {
        $data = $request->validate([
            'item_ids' => 'array|required_without:category_ids',
            'item_ids.*' => ['integer', Rule::exists('catalog_items', 'id')->where('is_active', true)],
            'category_ids' => 'array|required_without:item_ids',
            'category_ids.*' => ['integer', Rule::exists('catalog_categories', 'id')->where('is_active', true)],
            'with_items' => 'sometimes|boolean',
        ]);

        $result = $service->import(
            $request->user()->company,
            $data['item_ids'] ?? [],
            $data['category_ids'] ?? [],
            $data['with_items'] ?? true,
        );

        return $this->success($result);
    }
}
