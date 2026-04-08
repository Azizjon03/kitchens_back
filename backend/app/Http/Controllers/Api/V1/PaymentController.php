<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\CashShift;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    use ApiResponse;

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'method' => 'required|in:cash,card,click,payme',
            'amount' => 'required|numeric|min:0.01',
            'order_check_id' => 'nullable|exists:order_checks,id',
        ]);

        $user = $request->user();
        $order = Order::where('company_id', $user->company_id)->findOrFail($data['order_id']);

        if (in_array($order->status, ['cancelled', 'closed'])) {
            return $this->error('ORDER_NOT_PAYABLE', 'Cannot add payment to a cancelled or closed order.', 422);
        }

        $cashShiftId = null;

        if ($data['method'] === 'cash') {
            $cashShift = CashShift::where('branch_id', $order->branch_id)
                ->where('status', 'open')
                ->first();

            if (! $cashShift) {
                return $this->error('NO_OPEN_CASH_SHIFT', 'No open cash shift found for this branch.', 422);
            }

            $cashShiftId = $cashShift->id;
        }

        $payment = DB::transaction(function () use ($data, $order, $user, $cashShiftId) {
            $changeAmount = 0;

            if ($data['method'] === 'cash') {
                $totalPaid = $order->payments()
                    ->where('status', 'completed')
                    ->sum('amount');
                $remaining = bcsub($order->total, $totalPaid, 2);

                if ($data['amount'] > $remaining) {
                    $changeAmount = bcsub($data['amount'], $remaining, 2);
                }
            }

            $payment = Payment::create([
                'company_id' => $user->company_id,
                'order_id' => $order->id,
                'order_check_id' => $data['order_check_id'] ?? null,
                'cash_shift_id' => $cashShiftId,
                'method' => $data['method'],
                'amount' => $data['amount'],
                'change_amount' => $changeAmount,
                'status' => 'completed',
                'paid_at' => now(),
            ]);

            // Check if order is fully paid
            $totalPaid = $order->payments()
                ->where('status', 'completed')
                ->sum('amount');

            // For cash, subtract change amounts to get effective payment
            $totalChange = $order->payments()
                ->where('status', 'completed')
                ->sum('change_amount');

            $effectivePaid = bcsub($totalPaid, $totalChange, 2);

            if ($effectivePaid >= $order->total) {
                $order->update(['status' => 'paid']);
            }

            return $payment;
        });

        return $this->success($payment->load('order'), 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return $this->success($payment->load('order'));
    }
}
