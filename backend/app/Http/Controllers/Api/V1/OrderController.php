<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Addon;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
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

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'table_id' => 'nullable|exists:tables,id',
            'type' => 'required|in:dine_in,takeaway,delivery',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.modifier_ids.*' => 'exists:modifiers,id',
            'items.*.addon_ids' => 'nullable|array',
            'items.*.addon_ids.*' => 'exists:addons,id',
            'note' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $company = $user->company;

        $order = DB::transaction(function () use ($data, $user, $company) {
            $subtotal = 0;

            $order = Order::create([
                'company_id' => $company->id,
                'branch_id' => $data['branch_id'],
                'table_id' => $data['table_id'] ?? null,
                'user_id' => $user->id,
                'type' => $data['type'],
                'status' => 'preparing',
                'note' => $data['note'] ?? null,
            ]);

            foreach ($data['items'] as $itemData) {
                $menuItem = MenuItem::findOrFail($itemData['menu_item_id']);
                $unitPrice = $menuItem->price;
                $quantity = $itemData['quantity'];
                $weightKg = $itemData['weight_kg'] ?? null;

                $totalPrice = $weightKg
                    ? bcmul($unitPrice, $weightKg, 2)
                    : bcmul($unitPrice, $quantity, 2);

                // Add addon prices
                $addonTotal = 0;
                if (! empty($itemData['addon_ids'])) {
                    $addonTotal = Addon::whereIn('id', $itemData['addon_ids'])->sum('price');
                    $totalPrice = bcadd($totalPrice, bcmul($addonTotal, $quantity, 2), 2);
                }

                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $quantity,
                    'weight_kg' => $weightKg,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'note' => $itemData['note'] ?? null,
                ]);

                // Attach modifiers
                if (! empty($itemData['modifier_ids'])) {
                    foreach ($itemData['modifier_ids'] as $modifierId) {
                        DB::table('order_item_modifiers')->insert([
                            'order_item_id' => $orderItem->id,
                            'modifier_id' => $modifierId,
                        ]);
                    }
                }

                // Attach addons with prices
                if (! empty($itemData['addon_ids'])) {
                    $addons = Addon::whereIn('id', $itemData['addon_ids'])->get();
                    foreach ($addons as $addon) {
                        DB::table('order_item_addons')->insert([
                            'order_item_id' => $orderItem->id,
                            'addon_id' => $addon->id,
                            'price' => $addon->price,
                        ]);
                    }
                }

                $subtotal = bcadd($subtotal, $totalPrice, 2);
            }

            $serviceChargePct = $company->getServiceChargePct();
            $serviceChargeAmount = bcmul($subtotal, bcdiv($serviceChargePct, 100, 4), 2);
            $total = bcadd($subtotal, $serviceChargeAmount, 2);

            $order->update([
                'subtotal' => $subtotal,
                'service_charge_pct' => $serviceChargePct,
                'service_charge_amount' => $serviceChargeAmount,
                'total' => $total,
            ]);

            return $order;
        });

        return $this->success(
            $order->load(['table', 'user', 'orderItems.menuItem']),
            201
        );
    }

    public function show(Order $order): JsonResponse
    {
        return $this->success(
            $order->load(['table', 'user', 'orderItems.menuItem', 'payments', 'checks'])
        );
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.modifier_ids.*' => 'exists:modifiers,id',
            'items.*.addon_ids' => 'nullable|array',
            'items.*.addon_ids.*' => 'exists:addons,id',
            'note' => 'nullable|string|max:1000',
        ]);

        if (in_array($order->status, ['paid', 'closed', 'cancelled'])) {
            return $this->error('ORDER_NOT_EDITABLE', 'Cannot update an order that is paid, closed, or cancelled.', 422);
        }

        $company = $request->user()->company;

        DB::transaction(function () use ($order, $data, $company) {
            // Remove old items and related records
            $order->orderItems()->delete();

            $subtotal = 0;

            foreach ($data['items'] as $itemData) {
                $menuItem = MenuItem::findOrFail($itemData['menu_item_id']);
                $unitPrice = $menuItem->price;
                $quantity = $itemData['quantity'];
                $weightKg = $itemData['weight_kg'] ?? null;

                $totalPrice = $weightKg
                    ? bcmul($unitPrice, $weightKg, 2)
                    : bcmul($unitPrice, $quantity, 2);

                $addonTotal = 0;
                if (! empty($itemData['addon_ids'])) {
                    $addonTotal = Addon::whereIn('id', $itemData['addon_ids'])->sum('price');
                    $totalPrice = bcadd($totalPrice, bcmul($addonTotal, $quantity, 2), 2);
                }

                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $quantity,
                    'weight_kg' => $weightKg,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'note' => $itemData['note'] ?? null,
                ]);

                if (! empty($itemData['modifier_ids'])) {
                    foreach ($itemData['modifier_ids'] as $modifierId) {
                        DB::table('order_item_modifiers')->insert([
                            'order_item_id' => $orderItem->id,
                            'modifier_id' => $modifierId,
                        ]);
                    }
                }

                if (! empty($itemData['addon_ids'])) {
                    $addons = Addon::whereIn('id', $itemData['addon_ids'])->get();
                    foreach ($addons as $addon) {
                        DB::table('order_item_addons')->insert([
                            'order_item_id' => $orderItem->id,
                            'addon_id' => $addon->id,
                            'price' => $addon->price,
                        ]);
                    }
                }

                $subtotal = bcadd($subtotal, $totalPrice, 2);
            }

            $serviceChargePct = $order->service_charge_pct;
            $serviceChargeAmount = bcmul($subtotal, bcdiv($serviceChargePct, 100, 4), 2);
            $discountAmount = $order->discount_type === 'percentage'
                ? bcmul($subtotal, bcdiv($order->discount_value, 100, 4), 2)
                : ($order->discount_value ?? 0);
            $total = bcsub(bcadd($subtotal, $serviceChargeAmount, 2), $discountAmount, 2);

            $order->update([
                'subtotal' => $subtotal,
                'service_charge_amount' => $serviceChargeAmount,
                'discount_amount' => $discountAmount,
                'total' => $total,
                'note' => $data['note'] ?? $order->note,
            ]);
        });

        return $this->success(
            $order->fresh()->load(['table', 'user', 'orderItems.menuItem'])
        );
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|string',
        ]);

        $newStatus = $data['status'];
        $currentStatus = $order->status;
        $type = $order->type;

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

        $order->update(['status' => $newStatus]);

        return $this->success($order->fresh()->load(['table', 'user', 'orderItems.menuItem']));
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();

        if ($order->company_id !== $user->company_id) {
            return $this->error('FORBIDDEN', 'Order does not belong to your company.', 403);
        }

        if (! $user->canCancelOrder()) {
            return $this->error('FORBIDDEN', 'You do not have permission to cancel orders.', 403);
        }

        if (in_array($order->status, ['paid', 'closed', 'cancelled'])) {
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

        DB::transaction(function () use ($order, $user, $data, $company) {
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
        });

        return $this->success($order->fresh()->load(['table', 'user', 'orderItems.menuItem']));
    }

    public function applyDiscount(Request $request, Order $order): JsonResponse
    {
        if ($order->company_id !== $request->user()->company_id) {
            return $this->error('FORBIDDEN', 'Order does not belong to your company.', 403);
        }

        $data = $request->validate([
            'discount_type' => 'required|in:percentage,fixed',
            'discount_value' => 'required|numeric|min:0',
        ]);

        if (in_array($order->status, ['paid', 'closed', 'cancelled'])) {
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

        $discountAmount = $data['discount_type'] === 'percentage'
            ? bcmul($order->subtotal, bcdiv($data['discount_value'], 100, 4), 2)
            : $data['discount_value'];

        $total = bcsub(
            bcadd($order->subtotal, $order->service_charge_amount, 2),
            $discountAmount,
            2
        );

        $order->update([
            'discount_type' => $data['discount_type'],
            'discount_value' => $data['discount_value'],
            'discount_amount' => $discountAmount,
            'total' => $total,
        ]);

        return $this->success($order->fresh()->load(['table', 'user', 'orderItems.menuItem']));
    }
}
