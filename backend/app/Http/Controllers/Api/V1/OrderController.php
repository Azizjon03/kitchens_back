<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\MenuService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['table', 'user', 'orderItems.menuItem']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('table_id')) {
            $query->where('table_id', $request->table_id);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $orders = $query->orderByDesc('created_at')->paginate(20);

        return $this->success($orders);
    }

    /**
     * Menu (categories + available items) for staff taking orders (POS).
     */
    public function menu(Request $request, MenuService $menuService): JsonResponse
    {
        return $this->success(
            $menuService->forCompany($request->user()->company_id)
        );
    }

    public function store(Request $request, OrderService $orderService): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'table_id' => 'nullable|exists:tables,id',
            'type' => 'required|in:dine_in,takeaway,delivery',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.modifier_ids.*' => 'exists:modifiers,id',
            'items.*.addon_ids' => 'nullable|array',
            'items.*.addon_ids.*' => 'exists:addons,id',
            'note' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // sell_type / min_weight / weight_step rules are enforced inside the
        // service and surface as a 422 ValidationException.
        $order = $orderService->create($data, $user->company_id, $user->id);

        return $this->success(
            $order->load(['table', 'user', 'orderItems.menuItem']),
            201
        );
    }

    public function show(Order $order): JsonResponse
    {
        return $this->success(
            $order->load(['table', 'user', 'orderItems.menuItem', 'orderItems.modifiers', 'orderItems.addons', 'payments'])
        );
    }

    public function update(Request $request, Order $order, OrderService $orderService): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.modifier_ids.*' => 'exists:modifiers,id',
            'items.*.addon_ids' => 'nullable|array',
            'items.*.addon_ids.*' => 'exists:addons,id',
            'note' => 'nullable|string|max:1000',
        ]);

        if (in_array($order->status, OrderService::TERMINAL_STATUSES, true)) {
            return $this->error('ORDER_NOT_EDITABLE', 'Cannot update an order that is paid, closed, or cancelled.', 422);
        }

        $company = $request->user()->company;

        DB::transaction(function () use ($order, $data, $company, $orderService) {
            // Remove old items; modifier / add-on rows cascade with them.
            $order->orderItems()->delete();

            $subtotal = $orderService->syncItems($order, $data['items'], $company->id);

            $serviceChargeAmount = bcmul(
                $subtotal,
                bcdiv($orderService->decimal($order->service_charge_pct, 2), '100', 4),
                2
            );

            // Re-clamp the stored discount against the new (possibly smaller)
            // subtotal so the total can never go negative.
            $totals = $orderService->computeTotals(
                $subtotal,
                $serviceChargeAmount,
                $order->discount_type,
                $order->discount_value,
                $company->getMaxDiscountPct()
            );

            $order->update([
                'subtotal' => $subtotal,
                'service_charge_amount' => $serviceChargeAmount,
                'discount_amount' => $totals['discount_amount'],
                'total' => $totals['total'],
                'note' => $data['note'] ?? $order->note,
            ]);
        });

        $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);

        // The kitchen display is still showing the old item list. previous
        // status === current status marks a content-only update.
        OrderStatusUpdated::dispatch($order, $order->status);

        return $this->success($order);
    }

    public function updateStatus(Request $request, Order $order, OrderService $orderService): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|string',
        ]);

        $newStatus = $data['status'];
        $currentStatus = $order->status;
        $type = $order->type;

        // A chef may only mark food as ready (preparing -> ready).
        if ($request->user()->hasRole('chef') && $newStatus !== 'ready') {
            return $this->error(
                'FORBIDDEN',
                'Chefs can only mark orders as ready.',
                403
            );
        }

        $transitions = [
            'dine_in' => [
                'preparing' => 'ready',
                'ready' => 'served',
                'served' => 'paid',
                'paid' => 'closed',
            ],
            'takeaway' => [
                'preparing' => 'ready',
                'ready' => 'paid',
                'paid' => 'closed',
            ],
            'delivery' => [
                'preparing' => 'ready',
                'ready' => 'delivering',
                'delivering' => 'delivered',
                'delivered' => 'paid',
                'paid' => 'closed',
            ],
        ];

        $allowedNext = $transitions[$type][$currentStatus] ?? null;

        if ($allowedNext !== $newStatus) {
            return $this->error(
                'INVALID_STATUS_TRANSITION',
                "Cannot transition from '{$currentStatus}' to '{$newStatus}' for order type '{$type}'.",
                422
            );
        }

        // Money must exist before an order may be called paid; otherwise the
        // cash shift report would never see it. PaymentController is the only
        // place that can legitimately reach this status.
        if ($newStatus === 'paid' && ! $order->isFullyPaid()) {
            return $this->error(
                'PAYMENT_REQUIRED',
                "Order cannot be marked as paid: {$order->remainingAmount()} is still unpaid.",
                422
            );
        }

        DB::transaction(function () use ($order, $newStatus, $orderService) {
            $order->update(['status' => $newStatus]);

            if (in_array($newStatus, OrderService::TERMINAL_STATUSES, true)) {
                $orderService->releaseTableIfIdle($order);
            }
        });

        $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);

        OrderStatusUpdated::dispatch($order, $currentStatus);

        return $this->success($order);
    }

    public function cancel(Request $request, Order $order, OrderService $orderService): JsonResponse
    {
        $user = $request->user();

        if ($order->company_id !== $user->company_id) {
            return $this->error('FORBIDDEN', 'Order does not belong to your company.', 403);
        }

        if (! $user->canCancelOrder()) {
            return $this->error('FORBIDDEN', 'You do not have permission to cancel orders.', 403);
        }

        if (in_array($order->status, OrderService::TERMINAL_STATUSES, true)) {
            return $this->error('ORDER_NOT_CANCELLABLE', 'This order cannot be cancelled.', 422);
        }

        $company = $user->company;
        $cancelLimitMinutes = $company->getCancelTimeLimitMinutes();
        $minutesSinceCreation = $order->created_at->diffInMinutes(now());

        if ($minutesSinceCreation > $cancelLimitMinutes) {
            return $this->error(
                'CANCEL_TIME_EXCEEDED',
                "Orders can only be cancelled within {$cancelLimitMinutes} minutes of creation.",
                422
            );
        }

        $data = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $previousStatus = $order->status;

        DB::transaction(function () use ($order, $user, $data, $company, $orderService) {
            $order->update(['status' => 'cancelled']);

            DB::table('order_cancellations')->insert([
                'company_id' => $company->id,
                'order_id' => $order->id,
                'user_id' => $user->id,
                'reason' => $data['reason'],
                'cancelled_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $orderService->releaseTableIfIdle($order);
        });

        $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);

        // Tell the kitchen display to drop the order instead of cooking it.
        OrderStatusUpdated::dispatch($order, $previousStatus);

        return $this->success($order);
    }

    public function applyDiscount(Request $request, Order $order, OrderService $orderService): JsonResponse
    {
        if ($order->company_id !== $request->user()->company_id) {
            return $this->error('FORBIDDEN', 'Order does not belong to your company.', 403);
        }

        $data = $request->validate([
            'discount_type' => 'required|in:percentage,fixed',
            'discount_value' => 'required|numeric|min:0',
        ]);

        if (in_array($order->status, OrderService::TERMINAL_STATUSES, true)) {
            return $this->error('ORDER_NOT_EDITABLE', 'Cannot apply discount to a paid, closed, or cancelled order.', 422);
        }

        $company = $request->user()->company;
        $maxDiscountPct = $company->getMaxDiscountPct();

        if ($data['discount_type'] === 'percentage' && $data['discount_value'] > $maxDiscountPct) {
            return $this->error(
                'DISCOUNT_EXCEEDS_LIMIT',
                "Discount percentage cannot exceed {$maxDiscountPct}%.",
                422
            );
        }

        if ($data['discount_type'] === 'fixed') {
            $maxFixedDiscount = bcmul($order->subtotal, bcdiv($maxDiscountPct, 100, 4), 2);
            if ($data['discount_value'] > $maxFixedDiscount) {
                return $this->error(
                    'DISCOUNT_EXCEEDS_LIMIT',
                    "Fixed discount cannot exceed {$maxDiscountPct}% of subtotal ({$maxFixedDiscount}).",
                    422
                );
            }
        }

        $totals = $orderService->computeTotals(
            $orderService->decimal($order->subtotal, 2),
            $orderService->decimal($order->service_charge_amount, 2),
            $data['discount_type'],
            $data['discount_value'],
            $maxDiscountPct
        );

        $order->update([
            'discount_type' => $data['discount_type'],
            'discount_value' => $data['discount_value'],
            'discount_amount' => $totals['discount_amount'],
            'total' => $totals['total'],
        ]);

        return $this->success($order->fresh()->load(['table', 'user', 'orderItems.menuItem']));
    }
}
