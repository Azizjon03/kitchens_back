<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuItemController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = MenuItem::with('category');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('is_available')) {
            $query->where('is_available', $request->boolean('is_available'));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name_uz', 'like', "%{$search}%")
                  ->orWhere('name_ru', 'like', "%{$search}%");
            });
        }

        $menuItems = $query->orderBy('sort_order')->paginate(20);

        return $this->success($menuItems);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name_uz' => 'required|string|max:255',
            'name_ru' => 'required|string|max:255',
            'description_uz' => 'nullable|string',
            'description_ru' => 'nullable|string',
            'sell_type' => 'nullable|string|max:50',
            'price' => 'required|numeric|min:0',
            'min_weight' => 'nullable|numeric|min:0',
            'weight_step' => 'nullable|numeric|min:0',
            'image' => 'nullable|string|max:500',
            'cooking_time' => 'nullable|integer|min:0',
            'is_available' => 'sometimes|boolean',
            'is_popular' => 'sometimes|boolean',
            'sort_order' => 'nullable|integer',
            'allergens' => 'nullable|array',
            'modifier_ids' => 'nullable|array',
            'modifier_ids.*' => 'exists:modifiers,id',
            'addon_ids' => 'nullable|array',
            'addon_ids.*' => 'exists:addons,id',
        ]);

        $menuItem = MenuItem::create(collect($data)->except(['modifier_ids', 'addon_ids'])->toArray());

        if ($request->has('modifier_ids')) {
            $menuItem->modifiers()->sync($request->modifier_ids);
        }

        if ($request->has('addon_ids')) {
            $menuItem->addons()->sync($request->addon_ids);
        }

        return $this->success($menuItem->load('category', 'modifiers', 'addons'), 201);
    }

    public function show(MenuItem $menuItem): JsonResponse
    {
        return $this->success($menuItem->load('category', 'modifiers', 'addons'));
    }

    public function update(Request $request, MenuItem $menuItem): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'sometimes|exists:categories,id',
            'name_uz' => 'sometimes|string|max:255',
            'name_ru' => 'sometimes|string|max:255',
            'description_uz' => 'nullable|string',
            'description_ru' => 'nullable|string',
            'sell_type' => 'nullable|string|max:50',
            'price' => 'sometimes|numeric|min:0',
            'min_weight' => 'nullable|numeric|min:0',
            'weight_step' => 'nullable|numeric|min:0',
            'image' => 'nullable|string|max:500',
            'cooking_time' => 'nullable|integer|min:0',
            'is_available' => 'sometimes|boolean',
            'is_popular' => 'sometimes|boolean',
            'sort_order' => 'nullable|integer',
            'allergens' => 'nullable|array',
            'modifier_ids' => 'nullable|array',
            'modifier_ids.*' => 'exists:modifiers,id',
            'addon_ids' => 'nullable|array',
            'addon_ids.*' => 'exists:addons,id',
        ]);

        $menuItem->update(collect($data)->except(['modifier_ids', 'addon_ids'])->toArray());

        if ($request->has('modifier_ids')) {
            $menuItem->modifiers()->sync($request->modifier_ids);
        }

        if ($request->has('addon_ids')) {
            $menuItem->addons()->sync($request->addon_ids);
        }

        return $this->success($menuItem->fresh()->load('category', 'modifiers', 'addons'));
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $menuItem->delete();

        return $this->success(null);
    }

    public function toggleAvailability(MenuItem $menuItem): JsonResponse
    {
        $menuItem->update(['is_available' => ! $menuItem->is_available]);

        return $this->success($menuItem->fresh());
    }
}
