<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Category::orderBy('sort_order');

        if ($request->boolean('parent_only')) {
            $query->whereNull('parent_id');
        }

        $categories = $query->with('children')->get();

        return $this->success($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name_uz' => 'required|string|max:255',
            'name_ru' => 'required|string|max:255',
            'parent_id' => ['nullable', 'integer', $this->validParent($request->user()->company_id)],
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
        ]);

        $category = Category::create($data);

        return $this->success($category->load('children'), 201);
    }

    public function show(Category $category): JsonResponse
    {
        return $this->success($category->load('children'));
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name_uz' => 'sometimes|string|max:255',
            'name_ru' => 'sometimes|string|max:255',
            'parent_id' => ['nullable', 'integer', $this->validParent($request->user()->company_id, $category)],
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'sometimes|boolean',
        ]);

        $category->update($data);

        return $this->success($category->fresh()->load('children'));
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->delete();

        return $this->success(null);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:categories,id',
            'items.*.sort_order' => 'required|integer',
        ]);

        foreach ($request->items as $item) {
            Category::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return $this->success(null);
    }

    /**
     * Menyu ikki darajali (#23): ota kategoriya o'z kompaniyasidan (avval faqat
     * `exists` tekshirilardi — begona tenant kategoriyasini ota qilish mumkin edi),
     * yuqori darajada, o'zi emas; sub-menyusi bor kategoriya boshqasiga ko'chmaydi.
     */
    private function validParent(?int $companyId, ?Category $self = null): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($companyId, $self): void {
            $parent = Category::withoutGlobalScopes()
                ->where('company_id', $companyId)
                ->find($value);

            if (! $parent) {
                $fail('Tanlangan kategoriya topilmadi.');
            } elseif ($parent->parent_id !== null) {
                $fail("Sub-menyu ichida yana sub-menyu bo'lmaydi — yuqori darajadagi kategoriyani tanlang.");
            } elseif ($self && $parent->id === $self->id) {
                $fail("Kategoriya o'ziga ota bo'la olmaydi.");
            } elseif ($self && $self->children()->exists()) {
                $fail("Sub-menyulari bor kategoriyani boshqa kategoriya ichiga ko'chirib bo'lmaydi.");
            }
        };
    }
}
