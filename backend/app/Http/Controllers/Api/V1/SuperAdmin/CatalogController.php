<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Catalog\CatalogAddon;
use App\Models\Catalog\CatalogCategory;
use App\Models\Catalog\CatalogItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Standart menyu katalogi (#23) — global jadval, faqat super admin.
 * Kategoriya → sub-menyu → taom; taomlar faqat sub-menyuda; qo'shimchalar sub-menyularga biriktiriladi.
 * O'zgarishlar faqat KEYIN ochiladigan kompaniyalarga ta'sir qiladi.
 */
class CatalogController extends Controller
{
    use ApiResponse;

    private const RESTAURANT_TYPES = ['oshxona', 'fast_food', 'kafe', 'hammasi'];

    public function index(): JsonResponse
    {
        $categories = CatalogCategory::whereNull('parent_id')
            ->with(['children.items'])
            ->orderBy('sort_order')
            ->get();

        $addons = CatalogAddon::with('categories:id')->orderBy('id')->get()
            ->map(fn (CatalogAddon $a) => $this->addonPayload($a));

        return $this->success(['categories' => $categories, 'addons' => $addons]);
    }

    // ── Kategoriya / sub-menyu ─────────────────────────────────────────

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate($this->categoryRules());
        $data['sort_order'] ??= (int) CatalogCategory::where('parent_id', $data['parent_id'] ?? null)->max('sort_order') + 1;

        return $this->success(CatalogCategory::create($data)->load('children.items'), 201);
    }

    public function updateCategory(Request $request, CatalogCategory $category): JsonResponse
    {
        $data = $request->validate($this->categoryRules($category, partial: true));
        $category->update($data);

        return $this->success($category->fresh()->load('children.items'));
    }

    public function destroyCategory(CatalogCategory $category): JsonResponse
    {
        // Sub-menyular va taomlar FK cascade bilan o'chadi
        $category->delete();

        return $this->success(null);
    }

    // ── Taom ───────────────────────────────────────────────────────────

    public function storeItem(Request $request): JsonResponse
    {
        $data = $request->validate($this->itemRules());
        $data['sort_order'] ??= (int) CatalogItem::where('catalog_category_id', $data['catalog_category_id'])->max('sort_order') + 1;

        return $this->success(CatalogItem::create($data), 201);
    }

    public function updateItem(Request $request, CatalogItem $item): JsonResponse
    {
        $item->update($request->validate($this->itemRules(partial: true)));

        return $this->success($item->fresh());
    }

    public function destroyItem(CatalogItem $item): JsonResponse
    {
        $item->delete();

        return $this->success(null);
    }

    // ── Qo'shimcha ─────────────────────────────────────────────────────

    public function storeAddon(Request $request): JsonResponse
    {
        $data = $request->validate($this->addonRules());
        $addon = CatalogAddon::create($data);
        $addon->categories()->sync($data['category_ids'] ?? []);

        return $this->success($this->addonPayload($addon->load('categories:id')), 201);
    }

    public function updateAddon(Request $request, CatalogAddon $addon): JsonResponse
    {
        $data = $request->validate($this->addonRules(partial: true));
        $addon->update($data);
        if (array_key_exists('category_ids', $data)) {
            $addon->categories()->sync($data['category_ids'] ?? []);
        }

        return $this->success($this->addonPayload($addon->fresh()->load('categories:id')));
    }

    public function destroyAddon(CatalogAddon $addon): JsonResponse
    {
        $addon->delete();

        return $this->success(null);
    }

    // ── Qoidalar ───────────────────────────────────────────────────────

    private function categoryRules(?CatalogCategory $self = null, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'name_uz' => "{$req}|string|max:255",
            'name_ru' => "{$req}|string|max:255",
            'icon' => 'nullable|string|max:16',
            'parent_id' => ['nullable', 'integer', function ($attr, $value, $fail) use ($self) {
                $parent = CatalogCategory::find($value);
                if (! $parent) {
                    $fail('Tanlangan kategoriya topilmadi.');
                } elseif ($parent->parent_id !== null) {
                    $fail("Sub-menyu ichida yana sub-menyu bo'lmaydi.");
                } elseif ($self && ($parent->id === $self->id || $self->children()->exists())) {
                    $fail("Bu kategoriyani tanlangan joyga ko'chirib bo'lmaydi.");
                }
            }],
            'types' => 'nullable|array',
            'types.*' => ['string', Rule::in(self::RESTAURANT_TYPES)],
            'sort_order' => 'nullable|integer',
            'is_active' => 'sometimes|boolean',
        ];
    }

    private function itemRules(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'catalog_category_id' => [$req, 'integer', function ($attr, $value, $fail) {
                $category = CatalogCategory::find($value);
                if (! $category || $category->parent_id === null) {
                    $fail("Taom sub-menyuga qo'shiladi (masalan Suvlar → Gazli suv).");
                }
            }],
            'name_uz' => "{$req}|string|max:255",
            'name_ru' => "{$req}|string|max:255",
            'sell_type' => ['sometimes', Rule::in(['portion', 'weight'])],
            'price' => "{$req}|numeric|gt:0",
            'min_weight' => 'nullable|numeric|gt:0',
            'weight_step' => 'nullable|numeric|gt:0',
            'sort_order' => 'nullable|integer',
            'is_active' => 'sometimes|boolean',
        ];
    }

    private function addonRules(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'name_uz' => "{$req}|string|max:255",
            'name_ru' => "{$req}|string|max:255",
            'price' => "{$req}|numeric|gt:0",
            'is_active' => 'sometimes|boolean',
            'category_ids' => 'sometimes|array',
            'category_ids.*' => ['integer', Rule::exists('catalog_categories', 'id')->whereNotNull('parent_id')],
        ];
    }

    private function addonPayload(CatalogAddon $addon): array
    {
        return $addon->only(['id', 'name_uz', 'name_ru', 'price', 'is_active'])
            + ['category_ids' => $addon->categories->pluck('id')->values()->all()];
    }
}
