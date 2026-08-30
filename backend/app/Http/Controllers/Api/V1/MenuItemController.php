<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\ValidationException;

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
        $companyId = $request->user()->company_id;

        $data = $request->validate([
            'category_id' => ['required', $this->existsInCompany('categories', $companyId)],
            'name_uz' => 'required|string|max:255',
            'name_ru' => 'required|string|max:255',
            'description_uz' => 'nullable|string',
            'description_ru' => 'nullable|string',
            'sell_type' => ['nullable', Rule::in(['portion', 'weight'])],
            'price' => 'required|numeric|gt:0',
            'min_weight' => 'nullable|numeric|gt:0',
            'weight_step' => 'nullable|numeric|gt:0',
            'image' => 'nullable|string|max:500',
            'cooking_time' => 'nullable|integer|min:0',
            'is_available' => 'sometimes|boolean',
            'is_popular' => 'sometimes|boolean',
            'sort_order' => 'nullable|integer',
            'allergens' => 'nullable|array',
            'modifier_ids' => 'nullable|array',
            'modifier_ids.*' => $this->existsInCompany('modifiers', $companyId),
            'addon_ids' => 'nullable|array',
            'addon_ids.*' => $this->existsInCompany('addons', $companyId),
        ]);

        $this->applyWeightSettings($data, $data['sell_type'] ?? 'portion');

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
        // Scope by the item's own company so a super_admin editing another
        // tenant's item still cannot pull in a third tenant's records.
        $companyId = $menuItem->company_id;

        $data = $request->validate([
            'category_id' => ['sometimes', $this->existsInCompany('categories', $companyId)],
            'name_uz' => 'sometimes|string|max:255',
            'name_ru' => 'sometimes|string|max:255',
            'description_uz' => 'nullable|string',
            'description_ru' => 'nullable|string',
            'sell_type' => ['nullable', Rule::in(['portion', 'weight'])],
            'price' => 'sometimes|numeric|gt:0',
            'min_weight' => 'nullable|numeric|gt:0',
            'weight_step' => 'nullable|numeric|gt:0',
            'image' => 'nullable|string|max:500',
            'cooking_time' => 'nullable|integer|min:0',
            'is_available' => 'sometimes|boolean',
            'is_popular' => 'sometimes|boolean',
            'sort_order' => 'nullable|integer',
            'allergens' => 'nullable|array',
            'modifier_ids' => 'nullable|array',
            'modifier_ids.*' => $this->existsInCompany('modifiers', $companyId),
            'addon_ids' => 'nullable|array',
            'addon_ids.*' => $this->existsInCompany('addons', $companyId),
        ]);

        $this->applyWeightSettings($data, $data['sell_type'] ?? $menuItem->sell_type, $menuItem);

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

    /**
     * Enforce sell_type-specific rules on a menu item payload and normalise
     * min_weight/weight_step accordingly, before the record is written.
     *
     * Without this, an admin could save a `weight` item with weight_step = 0
     * (or a min_weight that isn't a multiple of weight_step); the item would
     * then be impossible to order, because OrderService::priceLine() enforces
     * the exact same rule on every order line and would reject every attempt.
     *
     * - sell_type = weight: weight_step is required (falling back to the
     *   existing record's value on update) and must be > 0; if min_weight is
     *   present it must be > 0 and a multiple of weight_step.
     * - sell_type = portion: min_weight is meaningless and is cleared to null
     *   (the column is nullable). weight_step is left untouched — the column
     *   is NOT NULL with a DB default (see migration 0001_01_01_000006) so
     *   there is no sensible "empty" value to reset it to, and
     *   OrderService::priceLine() never reads weight_step for a
     *   portion-priced item, so a stale value there is harmless.
     *
     * On update, this is only enforced when the request actually touches
     * sell_type / weight_step / min_weight — an unrelated partial edit (e.g.
     * renaming the item) must not be blocked by, or silently rewrite, a
     * weight configuration nobody asked to change.
     *
     * @param  array<string, mixed>  $data  Validated request data, mutated in place.
     *
     * @throws ValidationException
     */
    private function applyWeightSettings(array &$data, string $sellType, ?MenuItem $existing = null): void
    {
        $touchesWeightSettings = $existing === null
            || array_key_exists('sell_type', $data)
            || array_key_exists('weight_step', $data)
            || array_key_exists('min_weight', $data);

        if (! $touchesWeightSettings) {
            return;
        }

        $data['sell_type'] = $sellType;

        if ($sellType !== 'weight') {
            $data['min_weight'] = null;

            return;
        }

        $weightStep = array_key_exists('weight_step', $data) ? $data['weight_step'] : $existing?->weight_step;

        if ($weightStep === null || (float) $weightStep <= 0) {
            throw ValidationException::withMessages([
                'weight_step' => 'weight_step is required and must be greater than 0 when sell_type is weight.',
            ]);
        }

        $data['weight_step'] = $weightStep;

        $minWeight = array_key_exists('min_weight', $data) ? $data['min_weight'] : $existing?->min_weight;

        if ($minWeight !== null) {
            $minWeightDecimal = number_format((float) $minWeight, 3, '.', '');
            $stepDecimal = number_format((float) $weightStep, 3, '.', '');

            // Same tolerance as OrderService::priceLine(): weights are
            // stored with 3 decimals, so one unit of that scale absorbs
            // float noise while still catching a genuine mismatch.
            $tolerance = '0.001';
            $remainder = bcmod($minWeightDecimal, $stepDecimal, 3);
            $upperBound = bcsub($stepDecimal, $tolerance, 3);

            if (bccomp($remainder, $tolerance, 3) > 0 && bccomp($remainder, $upperBound, 3) < 0) {
                throw ValidationException::withMessages([
                    'min_weight' => "min_weight must be a multiple of weight_step ({$stepDecimal} kg).",
                ]);
            }

            $data['min_weight'] = $minWeightDecimal;
        }
    }

    /**
     * `exists` queries the table directly and so bypasses CompanyScope; without
     * this a company_admin could attach another tenant's category, modifier or
     * add-on to their own menu item. A super_admin has no company_id and stays
     * unscoped on purpose.
     */
    private function existsInCompany(string $table, ?int $companyId): Exists
    {
        return Rule::exists($table, 'id')->where(function ($query) use ($companyId) {
            if ($companyId !== null) {
                $query->where('company_id', $companyId);
            }
        });
    }
}
