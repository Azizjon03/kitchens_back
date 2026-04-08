<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\CashShift;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashShiftController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = CashShift::with(['user', 'branch']);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $shifts = $query->orderByDesc('opened_at')->paginate(20);

        return $this->success($shifts);
    }

    public function open(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'opening_amount' => 'required|numeric|min:0',
        ]);

        $user = $request->user();

        $existingShift = CashShift::where('branch_id', $data['branch_id'])
            ->where('status', 'open')
            ->first();

        if ($existingShift) {
            return $this->error(
                'SHIFT_ALREADY_OPEN',
                'There is already an open cash shift for this branch.',
                422
            );
        }

        $cashShift = CashShift::create([
            'company_id' => $user->company_id,
            'branch_id' => $data['branch_id'],
            'user_id' => $user->id,
            'opening_amount' => $data['opening_amount'],
            'opened_at' => now(),
            'status' => 'open',
        ]);

        return $this->success($cashShift->load(['user', 'branch']), 201);
    }

    public function close(Request $request): JsonResponse
    {
        $data = $request->validate([
            'closing_amount' => 'required|numeric|min:0',
            'difference_reason' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        $cashShift = CashShift::where('user_id', $user->id)
            ->where('company_id', $user->company_id)
            ->where('status', 'open')
            ->first();

        if (! $cashShift) {
            return $this->error('NO_OPEN_SHIFT', 'You do not have an open cash shift.', 422);
        }

        // Calculate expected amount: opening + cash payments - cash refunds
        $cashPayments = Payment::where('cash_shift_id', $cashShift->id)
            ->where('status', 'completed')
            ->where('method', 'cash')
            ->sum('amount');

        $cashChanges = Payment::where('cash_shift_id', $cashShift->id)
            ->where('status', 'completed')
            ->where('method', 'cash')
            ->sum('change_amount');

        $cashRefunds = DB::table('refunds')
            ->where('refund_method', 'cash')
            ->where('status', 'completed')
            ->where('created_at', '>=', $cashShift->opened_at)
            ->where('created_at', '<=', now())
            ->whereIn('order_id', function ($query) use ($cashShift) {
                $query->select('order_id')
                    ->from('payments')
                    ->where('cash_shift_id', $cashShift->id);
            })
            ->sum('amount');

        $expectedAmount = bcadd(
            $cashShift->opening_amount,
            bcsub(bcsub($cashPayments, $cashChanges, 2), $cashRefunds, 2),
            2
        );

        $difference = bcsub($data['closing_amount'], $expectedAmount, 2);

        if (bccomp($difference, '0', 2) !== 0 && empty($data['difference_reason'])) {
            return $this->error(
                'DIFFERENCE_REASON_REQUIRED',
                'A reason is required when the closing amount differs from the expected amount.',
                422
            );
        }

        $cashShift->update([
            'closing_amount' => $data['closing_amount'],
            'expected_amount' => $expectedAmount,
            'difference' => $difference,
            'difference_reason' => $data['difference_reason'] ?? null,
            'closed_at' => now(),
            'status' => 'closed',
        ]);

        return $this->success($cashShift->fresh()->load(['user', 'branch']));
    }

    public function current(Request $request): JsonResponse
    {
        $user = $request->user();

        $cashShift = CashShift::where('user_id', $user->id)
            ->where('status', 'open')
            ->with(['user', 'branch'])
            ->first();

        if (! $cashShift) {
            return $this->error('NO_OPEN_SHIFT', 'No open cash shift found.', 404);
        }

        return $this->success($cashShift);
    }

    public function report(CashShift $cashShift): JsonResponse
    {
        $payments = Payment::where('cash_shift_id', $cashShift->id)
            ->where('status', 'completed')
            ->get();

        $revenueByMethod = $payments->groupBy('method')->map(function ($group) {
            return [
                'total' => $group->sum('amount'),
                'change' => $group->sum('change_amount'),
                'net' => bcsub($group->sum('amount'), $group->sum('change_amount'), 2),
                'count' => $group->count(),
            ];
        });

        $refundsTotal = DB::table('refunds')
            ->where('status', 'completed')
            ->where('created_at', '>=', $cashShift->opened_at)
            ->where('created_at', '<=', $cashShift->closed_at ?? now())
            ->whereIn('order_id', function ($query) use ($cashShift) {
                $query->select('order_id')
                    ->from('payments')
                    ->where('cash_shift_id', $cashShift->id);
            })
            ->sum('amount');

        $report = [
            'cash_shift_id' => $cashShift->id,
            'status' => $cashShift->status,
            'opened_at' => $cashShift->opened_at,
            'closed_at' => $cashShift->closed_at,
            'opening_amount' => $cashShift->opening_amount,
            'closing_amount' => $cashShift->closing_amount,
            'expected_amount' => $cashShift->expected_amount,
            'difference' => $cashShift->difference,
            'difference_reason' => $cashShift->difference_reason,
            'revenue_by_method' => $revenueByMethod,
            'refunds_total' => $refundsTotal,
            'total_revenue' => bcsub($payments->sum('amount'), $payments->sum('change_amount'), 2),
            'total_transactions' => $payments->count(),
        ];

        return $this->success($report);
    }
}
