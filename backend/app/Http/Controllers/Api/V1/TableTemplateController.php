<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\TableTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Stol shablonlari (#24) — admin/menejer boshqaradi. */
class TableTemplateController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(
            TableTemplate::with('items.menuItem:id,name_uz,name_ru,price')->withCount('tables')->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules($request));

        $template = DB::transaction(function () use ($data) {
            $template = TableTemplate::create(['name' => $data['name']]);
            $template->items()->createMany($data['items']);

            return $template;
        });

        return $this->success($template->load('items.menuItem:id,name_uz,name_ru,price'), 201);
    }

    public function update(Request $request, TableTemplate $tableTemplate): JsonResponse
    {
        $data = $request->validate($this->rules($request));

        DB::transaction(function () use ($tableTemplate, $data) {
            $tableTemplate->update(['name' => $data['name']]);
            // Faqat keyingi o'tirishlarga ta'sir qiladi: ishlatilgan qatorlar buyurtmada narxi bilan saqlangan
            $tableTemplate->items()->delete();
            $tableTemplate->items()->createMany($data['items']);
        });

        return $this->success($tableTemplate->fresh()->load('items.menuItem:id,name_uz,name_ru,price'));
    }

    public function destroy(TableTemplate $tableTemplate): JsonResponse
    {
        // Stollardagi biriktirish nullOnDelete bilan bo'shaydi
        $tableTemplate->delete();

        return $this->success(null);
    }

    private function rules(Request $request): array
    {
        return [
            'name' => 'required|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('menu_items', 'id')->where('company_id', $request->user()->company_id),
            ],
            'items.*.quantity' => 'required|integer|min:1|max:99',
        ];
    }
}
