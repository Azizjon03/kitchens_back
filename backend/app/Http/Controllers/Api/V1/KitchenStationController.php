<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\KitchenStation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * #40: oshxona bo'limlari — nom, kategoriyalar va biriktirilgan oshpazlar.
 * Ro'yxatni oshpazlar ham oladi (oshxona ekranidagi bo'lim tanlovi uchun).
 */
class KitchenStationController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $stations = KitchenStation::with(['users:id,name', 'categories:id,name_uz,kitchen_station_id'])
            ->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (KitchenStation $s) => $this->present($s));

        return $this->success($stations);
    }

    /** Biriktirish uchun faol oshpazlar (menejer xodimlar ro'yxatini ko'rmaydi). */
    public function chefs(Request $request): JsonResponse
    {
        $chefs = User::where('company_id', $request->user()->company_id)->where('role', 'chef')
            ->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return $this->success($chefs);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, $request->user()->company_id);
        $station = DB::transaction(function () use ($data) {
            $station = KitchenStation::create(collect($data)->only(['name', 'sort_order', 'is_active', 'printer_id'])->all());
            $this->sync($station, $data);

            return $station;
        });

        return $this->success($this->present($station->fresh(['users:id,name', 'categories:id,name_uz,kitchen_station_id'])), 201);
    }

    public function update(Request $request, KitchenStation $kitchenStation): JsonResponse
    {
        $data = $this->validated($request, $kitchenStation->company_id, $kitchenStation);
        DB::transaction(function () use ($kitchenStation, $data) {
            $kitchenStation->update(collect($data)->only(['name', 'sort_order', 'is_active', 'printer_id'])->all());
            $this->sync($kitchenStation, $data);
        });

        return $this->success($this->present($kitchenStation->fresh(['users:id,name', 'categories:id,name_uz,kitchen_station_id'])));
    }

    public function destroy(KitchenStation $kitchenStation): JsonResponse
    {
        $kitchenStation->delete(); // kategoriya, taom va buyurtma qatorlaridagi bog'lanish null bo'ladi

        return $this->success(null);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?int $companyId, ?KitchenStation $station = null): array
    {
        $scoped = fn (string $table) => Rule::exists($table, 'id')->where(fn ($q) => $companyId === null ? $q : $q->where('company_id', $companyId));

        return $request->validate([
            'name' => [$station ? 'sometimes' : 'required', 'string', 'max:60',
                Rule::unique('kitchen_stations', 'name')->where('company_id', $companyId)->ignore($station?->id)],
            'sort_order' => 'sometimes|integer|min:0|max:1000',
            'is_active' => 'sometimes|boolean',
            'category_ids' => 'sometimes|array|max:200',
            'category_ids.*' => ['integer', $scoped('categories')],
            'user_ids' => 'sometimes|array|max:100',
            'user_ids.*' => ['integer', Rule::exists('users', 'id')->where(fn ($q) => $q->where('company_id', $companyId)->where('role', 'chef'))],
            'printer_id' => ['sometimes', 'nullable', $scoped('printers')], // #53
        ], [
            'name.unique' => 'Bunday nomli bo\'lim allaqachon bor.',
            'user_ids.*.exists' => 'Faqat shu restoranning oshpazlarini biriktirish mumkin.',
        ]);
    }

    /** @param array<string, mixed> $data */
    private function sync(KitchenStation $station, array $data): void
    {
        if (array_key_exists('category_ids', $data)) {
            Category::where('kitchen_station_id', $station->id)->whereNotIn('id', $data['category_ids'])->update(['kitchen_station_id' => null]);
            Category::whereIn('id', $data['category_ids'])->update(['kitchen_station_id' => $station->id]);
        }
        if (array_key_exists('user_ids', $data)) {
            $station->users()->sync($data['user_ids']);
        }
    }

    /** @return array<string, mixed> */
    private function present(KitchenStation $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'sort_order' => $s->sort_order,
            'is_active' => $s->is_active,
            'printer_id' => $s->printer_id,
            'users' => $s->users->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name])->values(),
            'categories' => $s->categories->map(fn (Category $c) => ['id' => $c->id, 'name_uz' => $c->name_uz])->values(),
        ];
    }
}
