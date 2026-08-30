<?php

namespace App\Services;

use App\Events\OrderCreated;
use App\Models\Addon;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Modifier;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Scopes\CompanyScope;
use App\Models\Table;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * Statuses that mean an order is finished: it no longer occupies a table
     * and can no longer be edited or paid.
     */
    public const TERMINAL_STATUSES = ['paid', 'closed', 'cancelled'];

    /**
     * Tolerance used when checking a weight against the item's weight_step.
     * Weights are stored with 3 decimals, so one unit of that scale is the
     * smallest meaningful difference and absorbs JSON float noise.
     */
    private const WEIGHT_TOLERANCE = '0.001';

    /**
     * Create an order with its items, modifiers and add-ons.
     *
     * Used by both staff (OrderController) and customers (Telegram Mini App),
     * so company_id / user_id / customer_id are passed explicitly instead of
     * relying on the authenticated user.
     *
     * @param  array<string, mixed>  $data  Validated payload: branch_id, table_id?, type, items[], note?
     *
     * @throws ValidationException When a line violates its menu item's sell_type rules.
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

            $subtotal = $this->syncItems($order, $data['items'], $company->id);

            $serviceChargePct = $company->getServiceChargePct();
            $serviceChargeAmount = bcmul($subtotal, bcdiv($this->decimal($serviceChargePct, 2), '100', 4), 2);
            $total = bcadd($subtotal, $serviceChargeAmount, 2);

            $order->update([
                'subtotal' => $subtotal,
                'service_charge_pct' => $serviceChargePct,
                'service_charge_amount' => $serviceChargeAmount,
                'total' => $total,
            ]);

            // Occupy the table for dine-in orders.
            if (! empty($data['table_id']) && $data['type'] === 'dine_in') {
                Table::withoutGlobalScope(CompanyScope::class)
                    ->where('company_id', $company->id)
                    ->where('id', $data['table_id'])
                    ->update(['status' => 'occupied']);
            }

            return $order;
        });

        $order->load(['table', 'user', 'orderItems.menuItem']);

        OrderCreated::dispatch($order);

        return $order;
    }

    /**
     * Persist the given lines onto an order and return the resulting subtotal.
     *
     * Every line is validated against its menu item's sell_type first, so a
     * portion-priced dish can never be charged as if it were sold by weight
     * (and vice versa). Every menu item, modifier and add-on referenced by a
     * line is also required to be available/active and to belong to the
     * given company, so a stale cart (Telegram) or a tampered payload can
     * never sneak a disabled or cross-tenant item onto the kitchen ticket.
     * Shared by order creation and order editing.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return string Subtotal as a bcmath decimal string (scale 2)
     *
     * @throws ValidationException
     */
    public function syncItems(Order $order, array $items, int $companyId): string
    {
        $subtotal = '0.00';

        foreach (array_values($items) as $index => $itemData) {
            $field = "items.{$index}";

            $menuItem = MenuItem::withoutGlobalScope(CompanyScope::class)
                ->where('company_id', $companyId)
                ->findOrFail($itemData['menu_item_id']);

            $this->assertMenuItemIsOrderable($menuItem, $companyId, $field);

            $line = $this->priceLine($menuItem, $itemData, $field);

            $modifiers = collect();

            if (! empty($itemData['modifier_ids'])) {
                $modifiers = $this->resolveModifiers(
                    $menuItem,
                    $itemData['modifier_ids'],
                    $companyId,
                    "{$field}.modifier_ids"
                );
            }

            $addons = collect();

            if (! empty($itemData['addon_ids'])) {
                $addons = $this->resolveAddons(
                    $menuItem,
                    $itemData['addon_ids'],
                    $companyId,
                    "{$field}.addon_ids"
                );

                // Add-ons are priced per portion. Weight lines always carry a
                // quantity of 1, so multiplying stays correct for both types.
                $addonTotal = $this->decimal($addons->sum('price'), 2);
                $line['total_price'] = bcadd(
                    $line['total_price'],
                    bcmul($addonTotal, $line['quantity'], 2),
                    2
                );
            }

            $orderItem = OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => $menuItem->id,
                'quantity' => $line['quantity'],
                'weight_kg' => $line['weight_kg'],
                'unit_price' => $this->decimal($menuItem->price, 2),
                'total_price' => $line['total_price'],
                'note' => $itemData['note'] ?? null,
            ]);

            foreach ($modifiers as $modifier) {
                DB::table('order_item_modifiers')->insert([
                    'order_item_id' => $orderItem->id,
                    'modifier_id' => $modifier->id,
                ]);
            }

            foreach ($addons as $addon) {
                DB::table('order_item_addons')->insert([
                    'order_item_id' => $orderItem->id,
                    'addon_id' => $addon->id,
                    'price' => $addon->price,
                ]);
            }

            $subtotal = bcadd($subtotal, $line['total_price'], 2);
        }

        return $subtotal;
    }

    /**
     * Reject a line whose menu item (or its category) has been taken off the
     * menu. `MenuService` already hides unavailable items from menu listings,
     * but without this check a stale client-side cart (or a direct API call)
     * could still order them.
     *
     * @throws ValidationException
     */
    private function assertMenuItemIsOrderable(MenuItem $menuItem, int $companyId, string $field): void
    {
        if (! $menuItem->is_available) {
            $this->fail("{$field}.menu_item_id", "\"{$menuItem->name_uz}\" is not available.");
        }

        $category = Category::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $companyId)
            ->find($menuItem->category_id);

        if ($category !== null && ! $category->is_active) {
            $this->fail("{$field}.menu_item_id", "\"{$menuItem->name_uz}\": its category is not available.");
        }
    }

    /**
     * Resolve and validate a line's modifier_ids: every id must be an
     * integer, belong to this company, be active, and be attached to this
     * specific menu item (via menu_item_modifiers) — otherwise the request
     * fails instead of silently dropping the unknown/foreign id.
     *
     * @param  array<int, mixed>  $rawIds
     *
     * @throws ValidationException
     */
    private function resolveModifiers(MenuItem $menuItem, array $rawIds, int $companyId, string $field): Collection
    {
        $ids = $this->normalizeIds($rawIds, $field);

        $attachedIds = DB::table('menu_item_modifiers')
            ->where('menu_item_id', $menuItem->id)
            ->pluck('modifier_id');

        $modifiers = Modifier::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->whereIn('id', $ids)
            ->whereIn('id', $attachedIds)
            ->get();

        if ($modifiers->count() !== count($ids)) {
            $invalid = collect($ids)->diff($modifiers->pluck('id'))->implode(', ');
            $this->fail($field, "Invalid or unavailable modifier id(s): {$invalid}.");
        }

        return $modifiers;
    }

    /**
     * Resolve and validate a line's addon_ids: every id must be an integer,
     * belong to this company, be active, and be attached to this specific
     * menu item (via menu_item_addons) — otherwise the request fails instead
     * of silently dropping the unknown/foreign id (which previously left the
     * customer thinking their add-on was ordered when it was not).
     *
     * @param  array<int, mixed>  $rawIds
     *
     * @throws ValidationException
     */
    private function resolveAddons(MenuItem $menuItem, array $rawIds, int $companyId, string $field): Collection
    {
        $ids = $this->normalizeIds($rawIds, $field);

        $attachedIds = DB::table('menu_item_addons')
            ->where('menu_item_id', $menuItem->id)
            ->pluck('addon_id');

        $addons = Addon::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->whereIn('id', $ids)
            ->whereIn('id', $attachedIds)
            ->get();

        if ($addons->count() !== count($ids)) {
            $invalid = collect($ids)->diff($addons->pluck('id'))->implode(', ');
            $this->fail($field, "Invalid or unavailable addon id(s): {$invalid}.");
        }

        return $addons;
    }

    /**
     * Coerce a list of modifier/addon ids into unique integers, rejecting
     * anything that isn't a whole number (floats, strings, arrays, bools).
     *
     * @param  array<int, mixed>  $rawIds
     * @return array<int, int>
     *
     * @throws ValidationException
     */
    private function normalizeIds(array $rawIds, string $field): array
    {
        $ids = [];

        foreach ($rawIds as $rawId) {
            if (! is_numeric($rawId) || (int) $rawId != $rawId) {
                $this->fail($field, 'Each id must be an integer.');
            }

            $ids[] = (int) $rawId;
        }

        return array_values(array_unique($ids));
    }

    /**
     * Validate one order line against its menu item's sell_type and return the
     * normalised quantity / weight / line total.
     *
     * This is the single place where menu_items.sell_type, min_weight and
     * weight_step are enforced; every entry point (staff POS create, staff POS
     * edit, Telegram Mini App) goes through it.
     *
     * @param  array<string, mixed>  $itemData
     * @param  string  $field  Dotted field prefix used in validation messages, e.g. "items.0"
     * @return array{quantity: string, weight_kg: string|null, total_price: string}
     *
     * @throws ValidationException
     */
    public function priceLine(MenuItem $menuItem, array $itemData, string $field = 'items.0'): array
    {
        $unitPrice = $this->decimal($menuItem->price, 2);
        $rawWeight = $itemData['weight_kg'] ?? null;
        $hasWeight = $rawWeight !== null && $rawWeight !== '';
        $name = $menuItem->name_uz;

        if ($menuItem->sell_type === 'weight') {
            if (! $hasWeight) {
                $this->fail("{$field}.weight_kg", "\"{$name}\" is sold by weight; weight_kg is required.");
            }

            $weight = $this->decimal($rawWeight, 3);

            if (bccomp($weight, '0.000', 3) <= 0) {
                $this->fail("{$field}.weight_kg", "\"{$name}\": weight_kg must be greater than zero.");
            }

            if ($menuItem->min_weight !== null) {
                $minWeight = $this->decimal($menuItem->min_weight, 3);

                if (bccomp($weight, $minWeight, 3) < 0) {
                    $this->fail(
                        "{$field}.weight_kg",
                        "\"{$name}\": minimum weight is {$minWeight} kg."
                    );
                }
            }

            if ($menuItem->weight_step !== null) {
                $step = $this->decimal($menuItem->weight_step, 3);

                if (bccomp($step, '0.000', 3) > 0) {
                    $remainder = bcmod($weight, $step, 3);
                    $upperBound = bcsub($step, self::WEIGHT_TOLERANCE, 3);

                    // Accept a remainder that is within one scale unit of 0 or
                    // of a full step; anything in between is a real mismatch.
                    if (bccomp($remainder, self::WEIGHT_TOLERANCE, 3) > 0
                        && bccomp($remainder, $upperBound, 3) < 0) {
                        $this->fail(
                            "{$field}.weight_kg",
                            "\"{$name}\": weight_kg must be a multiple of {$step} kg."
                        );
                    }
                }
            }

            // A weight line is one weighed serving; quantity carries no pricing
            // meaning here and is pinned to 1 so add-ons are not multiplied.
            return [
                'quantity' => '1.00',
                'weight_kg' => $weight,
                'total_price' => bcmul($unitPrice, $weight, 2),
            ];
        }

        // Portion-priced item: a weight would silently divide the price, so it
        // is rejected outright instead of being ignored.
        if ($hasWeight) {
            $this->fail(
                "{$field}.weight_kg",
                "\"{$name}\" is sold by portion; weight_kg must not be sent."
            );
        }

        $quantity = $this->decimal($itemData['quantity'] ?? 1, 2);

        if (bccomp($quantity, '0.00', 2) <= 0) {
            $this->fail("{$field}.quantity", "\"{$name}\": quantity must be greater than zero.");
        }

        return [
            'quantity' => $quantity,
            'weight_kg' => null,
            'total_price' => bcmul($unitPrice, $quantity, 2),
        ];
    }

    /**
     * Recompute an order's discount amount and grand total.
     *
     * The discount is clamped to the company's maximum and to the order value
     * itself, so re-applying a stored discount to a smaller subtotal (order
     * edit) can never produce a negative total.
     *
     * @return array{discount_amount: string, total: string}
     */
    public function computeTotals(
        string $subtotal,
        string $serviceChargeAmount,
        ?string $discountType,
        mixed $discountValue,
        float $maxDiscountPct
    ): array {
        $gross = bcadd($subtotal, $serviceChargeAmount, 2);
        $maxPct = $this->decimal($maxDiscountPct, 2);
        $maxDiscount = bcmul($subtotal, bcdiv($maxPct, '100', 4), 2);

        $discountAmount = '0.00';

        if ($discountType !== null && $discountValue !== null) {
            if ($discountType === 'percentage') {
                $pct = $this->decimal($discountValue, 2);

                if (bccomp($pct, $maxPct, 2) > 0) {
                    $pct = $maxPct;
                }

                $discountAmount = bcmul($subtotal, bcdiv($pct, '100', 4), 2);
            } else {
                $discountAmount = $this->decimal($discountValue, 2);

                if (bccomp($discountAmount, $maxDiscount, 2) > 0) {
                    $discountAmount = $maxDiscount;
                }
            }
        }

        if (bccomp($discountAmount, '0.00', 2) < 0) {
            $discountAmount = '0.00';
        }

        // Never discount more than the order is worth.
        if (bccomp($discountAmount, $gross, 2) > 0) {
            $discountAmount = $gross;
        }

        return [
            'discount_amount' => $discountAmount,
            'total' => bcsub($gross, $discountAmount, 2),
        ];
    }

    /**
     * Free the order's table once no other active order is sitting on it.
     *
     * Must be called whenever an order reaches a terminal status (paid, closed
     * or cancelled); without it a dine-in table stays "occupied" forever.
     */
    public function releaseTableIfIdle(Order $order): void
    {
        if (! $order->table_id) {
            return;
        }

        $stillOccupied = Order::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $order->company_id)
            ->where('table_id', $order->table_id)
            ->whereKeyNot($order->getKey())
            ->whereNotIn('status', self::TERMINAL_STATUSES)
            ->exists();

        if ($stillOccupied) {
            return;
        }

        Table::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $order->company_id)
            ->whereKey($order->table_id)
            ->where('status', 'occupied')
            ->update(['status' => 'free']);
    }

    /**
     * Normalise a value coming from JSON (PHP float) into a fixed-scale decimal
     * string, so every later step can stay inside bcmath.
     */
    public function decimal(mixed $value, int $scale): string
    {
        return number_format((float) $value, $scale, '.', '');
    }

    /**
     * @throws ValidationException
     */
    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
