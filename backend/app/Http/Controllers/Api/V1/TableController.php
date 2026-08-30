<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TableController extends Controller
{
    use ApiResponse;

    /**
     * Order statuses that mean the order is finished and no longer "owns"
     * the table it was placed on. Anything not in this list is considered
     * an active order for the purposes of table transfer/merge/free/delete.
     */
    private const TERMINAL_ORDER_STATUSES = ['paid', 'closed', 'cancelled'];

    /**
     * Table statuses a table may be merged INTO. A table already merged,
     * reserved, or being cleaned is not a valid merge target.
     */
    private const MERGEABLE_TARGET_STATUSES = ['free', 'occupied'];

    public function index(Request $request): JsonResponse
    {
        $query = Table::with('assignedWaiter');

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $tables = $query->orderBy('number')->get();

        return $this->success($tables);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $data = $request->validate([
            'number' => [
                'required',
                'string',
                'max:20',
                Rule::unique('tables')->where(fn ($query) => $query
                    ->where('company_id', $companyId)
                    ->where('branch_id', $request->input('branch_id'))),
            ],
            'seats' => 'required|integer|min:1',
            'zone' => 'nullable|string|max:255',
            'branch_id' => 'required|exists:branches,id',
        ]);

        $table = Table::create($data);

        return $this->success($table->load('assignedWaiter'), 201);
    }

    public function show(Table $table): JsonResponse
    {
        return $this->success($table->load('assignedWaiter'));
    }

    public function update(Request $request, Table $table): JsonResponse
    {
        $companyId = $table->company_id;

        $data = $request->validate([
            'number' => [
                'sometimes',
                'string',
                'max:20',
                Rule::unique('tables')->ignore($table->id)->where(fn ($query) => $query
                    ->where('company_id', $companyId)
                    ->where('branch_id', $request->input('branch_id', $table->branch_id))),
            ],
            'seats' => 'sometimes|integer|min:1',
            'zone' => 'nullable|string|max:255',
            'branch_id' => 'sometimes|exists:branches,id',
            'assigned_waiter_id' => 'nullable|exists:users,id',
        ]);

        $table->update($data);

        return $this->success($table->fresh()->load('assignedWaiter'));
    }

    public function destroy(Table $table): JsonResponse
    {
        if ($this->hasActiveOrder($table)) {
            return $this->error('TABLE_HAS_ACTIVE_ORDERS', 'Table has active orders and cannot be deleted.', 422);
        }

        $table->delete();

        return $this->success(null);
    }

    public function updateStatus(Request $request, Table $table): JsonResponse
    {
        $request->validate([
            'status' => 'required|string|in:free,occupied,reserved,cleaning',
        ]);

        if ($request->status === 'free' && $this->hasActiveOrder($table)) {
            return $this->error('TABLE_HAS_ACTIVE_ORDERS', 'Table has active orders and cannot be freed.', 422);
        }

        $table->update(['status' => $request->status]);

        return $this->success($table->fresh());
    }

    public function transfer(Request $request, Table $table): JsonResponse
    {
        $request->validate([
            'target_table_id' => 'required|exists:tables,id',
        ]);

        $targetTable = Table::where('company_id', $request->user()->company_id)
            ->findOrFail($request->target_table_id);

        if ($targetTable->status !== 'free') {
            return $this->error('TABLE_NOT_FREE', 'Target table is not free.', 422);
        }

        DB::transaction(function () use ($table, $targetTable) {
            Order::where('table_id', $table->id)
                ->whereNotIn('status', self::TERMINAL_ORDER_STATUSES)
                ->update(['table_id' => $targetTable->id]);

            $targetTable->update(['status' => 'occupied']);
            $table->update(['status' => 'free']);
        });

        return $this->success([
            'source_table' => $table->fresh(),
            'target_table' => $targetTable->fresh(),
        ]);
    }

    public function merge(Request $request, Table $table): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $request->validate([
            'target_table_id' => [
                'required',
                'integer',
                Rule::exists('tables', 'id')->where(fn ($query) => $query
                    ->where('company_id', $companyId)
                    ->where('branch_id', $table->branch_id)),
            ],
        ]);

        if ((int) $request->target_table_id === $table->id) {
            return $this->error('CANNOT_MERGE_SELF', 'A table cannot be merged with itself.', 422);
        }

        if ($table->status === 'merged' || $table->merged_with_table_id !== null) {
            return $this->error('TABLE_ALREADY_MERGED', 'This table is already merged with another table.', 422);
        }

        $targetTable = Table::where('company_id', $companyId)
            ->where('branch_id', $table->branch_id)
            ->findOrFail($request->target_table_id);

        if (! in_array($targetTable->status, self::MERGEABLE_TARGET_STATUSES, true)) {
            return $this->error('TARGET_TABLE_NOT_AVAILABLE', 'Target table is not available to merge into.', 422);
        }

        $table->update([
            'status' => 'merged',
            'merged_with_table_id' => $targetTable->id,
        ]);

        return $this->success($table->fresh());
    }

    public function unmerge(Table $table): JsonResponse
    {
        if ($table->merged_with_table_id === null) {
            return $this->error('TABLE_NOT_MERGED', 'This table is not merged with another table.', 422);
        }

        $status = $this->hasActiveOrder($table) ? 'occupied' : 'free';

        $table->update([
            'status' => $status,
            'merged_with_table_id' => null,
        ]);

        return $this->success($table->fresh());
    }

    private function hasActiveOrder(Table $table): bool
    {
        return Order::where('table_id', $table->id)
            ->whereNotIn('status', self::TERMINAL_ORDER_STATUSES)
            ->exists();
    }
}
