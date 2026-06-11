<?php

namespace App\Services;

use App\Events\OrderCreated;
use App\Models\Addon;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use Illuminate\Support\Facades\DB;

class OrderService
{
    /**
     * Create an order with its items, modifiers and add-ons.
     *
     * Used by both staff (OrderController) and customers (Telegram Mini App),
     * so company_id / user_id / customer_id are passed explicitly instead of
     * relying on the authenticated user.
     *
     * @param  array<string, mixed>  $data  Validated payload: branch_id, table_id?, type, items[], note?
     */
    public function create(array $data, int $companyId, ?int $userId = null, ?int $customerId = null): Order
    {
        $company = Company::findOrFail($companyId);

        $order = DB::transaction(function () use ($data, $company, $userId, $customerId) {
            $order = Order::create([
                'company_id' => $company->id,
                'branch_id' => $data['branch_id'],
                'table_id' => $data['table_id'] ?? null,
                'user_id' => $userId,
                'customer_id' => $customerId,
                'type' => $data['type'],
                'status' => 'preparing',
                'note' => $data['note'] ?? null,
            ]);

            $subtotal = 0;

            foreach ($data['items'] as $itemData) {
                $menuItem = MenuItem::where('company_id', $company->id)
                    ->findOrFail($itemData['menu_item_id']);

                $unitPrice = $menuItem->price;
                $quantity = $itemData['quantity'];
                $weightKg = $itemData['weight_kg'] ?? null;

                $totalPrice = $weightKg
                    ? bcmul($unitPrice, $weightKg, 2)
                    : bcmul($unitPrice, $quantity, 2);

                if (! empty($itemData['addon_ids'])) {
                    $addonTotal = Addon::where('company_id', $company->id)
                        ->whereIn('id', $itemData['addon_ids'])
                        ->sum('price');
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
                    $addons = Addon::where('company_id', $company->id)
                        ->whereIn('id', $itemData['addon_ids'])
                        ->get();
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

            // Occupy the table for dine-in orders.
            if (! empty($data['table_id']) && $data['type'] === 'dine_in') {
                Table::where('company_id', $company->id)
                    ->where('id', $data['table_id'])
                    ->update(['status' => 'occupied']);
            }

            return $order;
        });

        $order->load(['table', 'user', 'orderItems.menuItem']);

        OrderCreated::dispatch($order);

        return $order;
    }
}
