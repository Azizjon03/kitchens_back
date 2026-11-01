<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Concerns\DefaultsToSingleBranch;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Table;
use App\Models\TableGroup;
use App\Services\OrderService;
use App\Services\TableGroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** #49: zallar — nom, ichidagi stollar, «butun zalga buyurtma» ruxsati. */
class TableGroupController extends Controller
{
    use ApiResponse, DefaultsToSingleBranch;

    public function __construct(private TableGroupService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $groups = TableGroup::query()
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->withCount(['tables as tables_count' => fn ($q) => $q->where('is_whole_group', false)])
            ->orderBy('sort_order')->orderBy('id')->get();

        return $this->success($groups);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $this->defaultToSingleBranch($request, $companyId);
        $data = $this->validated($request, $companyId);

        $group = DB::transaction(function () use ($data) {
            $group = TableGroup::create([
                'branch_id' => $data['branch_id'], 'name' => trim($data['name']),
                'allow_whole' => (bool) ($data['allow_whole'] ?? false),
                'sort_order' => (int) TableGroup::where('branch_id', $data['branch_id'])->max('sort_order') + 1,
            ]);
            $this->assign($group, $data['table_ids'] ?? []);

            return $group;
        });
        $this->service->syncWholeTable($group);

        return $this->success($group->fresh(), 201);
    }

    public function update(Request $request, TableGroup $tableGroup): JsonResponse
    {
        $data = $this->validated($request, $tableGroup->company_id, $tableGroup);
        DB::transaction(function () use ($tableGroup, $data) {
            $tableGroup->update(array_filter([
                'name' => isset($data['name']) ? trim($data['name']) : null,
                'allow_whole' => $data['allow_whole'] ?? null,
            ], fn ($v) => $v !== null));
            if (array_key_exists('table_ids', $data)) {
                $this->assign($tableGroup, $data['table_ids']);
            }
        });
        $this->service->syncWholeTable($tableGroup->fresh());

        return $this->success($tableGroup->fresh());
    }

    public function destroy(TableGroup $tableGroup): JsonResponse
    {
        $whole = Table::where('table_group_id', $tableGroup->id)->where('is_whole_group', true)->first();
        if ($whole && Order::where('table_id', $whole->id)->whereNotIn('status', OrderService::TERMINAL_STATUSES)->exists()) {
            return $this->error('GROUP_IN_USE', "Butun zalda faol buyurtma bor — avval uni yoping.", 422);
        }
        DB::transaction(function () use ($tableGroup, $whole) {
            $whole?->delete();
            Table::where('table_group_id', $tableGroup->id)->update(['table_group_id' => null]);
            $tableGroup->delete();
        });

        return $this->success(null);
    }

    /** Zal ichidagi stollar ro'yxatini almashtiradi (butun zal joyi bundan mustasno) */
    private function assign(TableGroup $group, array $tableIds): void
    {
        Table::where('table_group_id', $group->id)->where('is_whole_group', false)->whereNotIn('id', $tableIds)
            ->update(['table_group_id' => null]);
        Table::whereIn('id', $tableIds)->where('branch_id', $group->branch_id)->where('is_whole_group', false)
            ->update(['table_group_id' => $group->id, 'zone' => $group->name]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?int $companyId, ?TableGroup $group = null): array
    {
        $branchId = $group?->branch_id ?? $request->input('branch_id');

        return $request->validate([
            'branch_id' => [$group ? 'prohibited' : 'required', Rule::exists('branches', 'id')->where('company_id', $companyId)],
            'name' => [$group ? 'sometimes' : 'required', 'string', 'max:60',
                Rule::unique('table_groups', 'name')->where('branch_id', $branchId)->ignore($group?->id)],
            'allow_whole' => 'sometimes|boolean',
            'table_ids' => 'sometimes|array|max:200',
            'table_ids.*' => ['integer', Rule::exists('tables', 'id')->where('company_id', $companyId)],
        ], ['name.unique' => "Bu filialda shunday nomli zal bor."]);
    }
}
