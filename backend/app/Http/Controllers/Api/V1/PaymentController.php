<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\CashShift;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    use ApiResponse;

    /**
     * Statuses that can no longer receive a payment. "paid" is included so a
     * settled order cannot be charged a second time.
     */
    private const NOT_PAYABLE_STATUSES = ['cancelled', 'closed', 'paid'];

    public function store(Request $request, OrderService $orderService): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|exists:orders,id',
            // Phase 1: cash + card only. Online methods (click/payme) come later.
            'method' => 'required|in:cash,card',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $user = $request->user();
        $order = Order::where('company_id', $user->company_id)->findOrFail($data['order_id']);

        if (in_array($order->status, self::NOT_PAYABLE_STATUSES, true)) {
            return $this->error(
                'ORDER_NOT_PAYABLE',
                'Cannot add payment to a cancelled, closed, or already paid order.',
                422
            );
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

        $previousStatus = $order->status;

        $result = DB::transaction(function () use ($data, $order, $user, $cashShiftId, $orderService) {
            // Lock the order row: read-compute-write of the remaining balance
            // must not interleave with a second concurrent payment.
            $locked = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if (in_array($locked->status, self::NOT_PAYABLE_STATUSES, true)) {
                return ['error' => ['ORDER_NOT_PAYABLE', 'Cannot add payment to a cancelled, closed, or already paid order.']];
            }

            $amount = $orderService->decimal($data['amount'], 2);
            $remaining = $locked->remainingAmount();

            if (bccomp($remaining, '0.00', 2) <= 0) {
                return ['error' => ['ORDER_ALREADY_PAID', 'This order is already fully paid.']];
            }

            $changeAmount = '0.00';

            if (bccomp($amount, $remaining, 2) > 0) {
                if ($data['method'] !== 'cash') {
                    // A card overpayment cannot be handed back as change; it
                    // would inflate takings, so refuse it outright.
                    return ['error' => [
                        'AMOUNT_EXCEEDS_REMAINING',
                        "Card payment cannot exceed the remaining balance ({$remaining}).",
                    ]];
                }

                $changeAmount = bcsub($amount, $remaining, 2);
            }

            $payment = Payment::create([
                'company_id' => $user->company_id,
                'order_id' => $locked->id,
                'order_check_id' => $data['order_check_id'] ?? null,
                'cash_shift_id' => $cashShiftId,
                'method' => $data['method'],
                'amount' => $amount,
                'change_amount' => $changeAmount,
                'status' => 'completed',
                'paid_at' => now(),
            ]);

            $becamePaid = false;

            if ($locked->isFullyPaid()) {
                $locked->update(['status' => 'paid']);
                $orderService->releaseTableIfIdle($locked);
                $becamePaid = true;
            }

            return ['payment' => $payment, 'became_paid' => $becamePaid];
        });

        if (isset($result['error'])) {
            return $this->error($result['error'][0], $result['error'][1], 422);
        }

        if ($result['became_paid']) {
            // Let the KDS / waiter screens close the order out in real time.
            $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);
            OrderStatusUpdated::dispatch($order, $previousStatus);
        }

        return $this->success($result['payment']->load('order'), 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return $this->success($payment->load('order'));
    }
}
