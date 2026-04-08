<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TableController extends Controller
{
    use ApiResponse;

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
        $data = $request->validate([
            'number' => 'required|integer',
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
        $data = $request->validate([
            'number' => 'sometimes|integer',
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
        $table->delete();

        return $this->success(null);
    }

    public function updateStatus(Request $request, Table $table): JsonResponse
    {
        $request->validate([
            'status' => 'required|string|in:free,occupied,reserved,cleaning',
        ]);

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
                ->whereNotIn('status', ['completed', 'cancelled'])
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
        $request->validate([
            'target_table_id' => 'required|exists:tables,id',
        ]);

        $targetTable = Table::where('company_id', $request->user()->company_id)
            ->findOrFail($request->target_table_id);

        $table->update([
            'status' => 'merged',
            'merged_with_table_id' => $targetTable->id,
        ]);

        return $this->success($table->fresh());
    }

    public function unmerge(Table $table): JsonResponse
    {
        $table->update([
            'status' => 'free',
            'merged_with_table_id' => null,
        ]);

        return $this->success($table->fresh());
    }
}
