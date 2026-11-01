<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Concerns\DefaultsToSingleBranch;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\MenuService;
use App\Services\KitchenService;
use App\Support\Phone;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class OrderController extends Controller
{
    use DefaultsToSingleBranch;
    use ApiResponse;

    /** Faol buyurtmalar uchun xavfsizlik chegarasi — oddiy restoranda bu son hech qachon yetmaydi. */
    private const ACTIVE_ORDERS_LIMIT = 500;

    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['table', 'user', 'orderItems.menuItem']);

        if ($request->filled('status')) {
            // Bir nechta holat vergul bilan: ?status=preparing,ready
            $query->whereIn('status', explode(',', (string) $request->input('status')));
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

        // #43: ofitsiantning o'z buyurtmalari
        if ($request->boolean('mine')) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // KDS / ofitsiant ekrani (?active=1): filialning BARCHA faol buyurtmalari, eskidan
        // yangiga — eng uzoq kutayotgani birinchi. Sahifalash bu yerda eng shoshilinch
        // buyurtmalarni ekrandan tushirib qoldirardi (#5). Terminal holatlar chiqarilmaydi.
        if ($request->boolean('active')) {
            $orders = $query->whereNotIn('status', OrderService::TERMINAL_STATUSES)
                ->orderBy('created_at')
                ->orderBy('id')
                ->limit(self::ACTIVE_ORDERS_LIMIT)
                ->get();

            return $this->success($orders);
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
        $user = $request->user();
        $companyId = $user->company_id;
        $this->defaultToSingleBranch($request, $companyId);

        $data = $request->validate([
            'branch_id' => ['required', $this->existsInCompany('branches', $companyId)],
            'table_id' => ['nullable', $this->existsInCompany('tables', $companyId)],
            'type' => 'required|in:dine_in,takeaway,delivery',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.modifier_ids.*' => $this->existsInCompany('modifiers', $companyId),
            'items.*.addon_ids' => 'nullable|array',
            'items.*.addon_ids.*' => $this->existsInCompany('addons', $companyId),
            // #35: qo'shimcha soni (oshga 2× go'sht)
            'items.*.addons' => 'nullable|array|max:20',
            'items.*.addons.*.id' => 'required|integer',
            'items.*.addons.*.quantity' => 'required|integer|min:1|max:50',
            'note' => 'nullable|string|max:1000',
        ]);

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

    /**
     * #44: chek uchun ma'lumot — restoran, filial, buyurtma, qatorlar (bo'lim, istaklar,
     * qo'shimcha soni), to'lovlar va kassir. Oddiy (fiskal bo'lmagan) chek.
     */
    public function receipt(Request $request, Order $order): JsonResponse
    {
        $order->load(['table', 'user', 'branch', 'customer', 'orderItems.menuItem', 'orderItems.modifiers', 'orderItems.addons', 'orderItems.station', 'payments.cashShift.user']);
        $company = $order->company()->first();
        $completed = $order->payments->where('status', 'completed');
        $cashier = $completed->last()?->cashShift?->user;

        return $this->success([
            'company' => [
                'name' => $company->name,
                'address' => $order->branch?->address ?: $company->address,
                'phone' => Phone::format($order->branch?->phone ?: $company->phone),
                'menu_url' => rtrim((string) config('app.url'), '/').'/r/'.$company->slug,
            ],
            'order' => [
                'id' => $order->id,
                'type' => $order->type,
                'status' => $order->status,
                'created_at' => optional($order->created_at)->toIso8601String(),
                'table' => $order->table?->number,
                'seats' => $order->table?->seats,
                'waiter' => $order->user?->name,
                'note' => $order->note,
                'subtotal' => (float) $order->subtotal,
                'service_charge_pct' => (float) $order->service_charge_pct,
                'service_charge_amount' => (float) $order->service_charge_amount,
                'discount_amount' => (float) $order->discount_amount,
                'delivery_fee' => (float) $order->delivery_fee,
                'total' => (float) $order->total,
                'customer' => $order->customer ? ['name' => $order->customer->name, 'phone' => Phone::format($order->customer->phone)] : null,
                'delivery_address' => $order->delivery_address,
                'delivery_lat' => $order->delivery_lat !== null ? (float) $order->delivery_lat : null,
                'delivery_lng' => $order->delivery_lng !== null ? (float) $order->delivery_lng : null,
            ],
            'items' => $order->orderItems->reject(fn ($it) => $it->is_table_set && (float) $it->total_price === 0.0)->values()->map(fn ($it) => [
                'name' => $it->menuItem?->name_uz ?? 'Taom',
                'quantity' => (float) $it->quantity,
                'weight_kg' => $it->weight_kg !== null ? (float) $it->weight_kg : null,
                'unit_price' => (float) $it->unit_price,
                'total' => (float) $it->total_price,
                'note' => $it->note,
                'station_id' => $it->kitchen_station_id,
                'station' => $it->getRelationValue('station')?->name,
                'is_table_set' => (bool) $it->is_table_set,
                'modifiers' => $it->modifiers->pluck('name_uz')->values(),
                'addons' => $it->addons->map(fn ($a) => ['name' => $a->name_uz, 'quantity' => (int) ($a->pivot->quantity ?? 1), 'price' => (float) ($a->pivot->price ?? $a->price)])->values(),
            ]),
            'payments' => $completed->values()->map(fn ($p) => [
                'method' => $p->method,
                'amount' => (float) $p->amount,
                'change' => (float) $p->change_amount,
                'paid_at' => optional($p->paid_at)->toIso8601String(),
            ]),
            'cashier' => $cashier?->name,
        ]);
    }

    public function update(Request $request, Order $order, OrderService $orderService): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.modifier_ids.*' => $this->existsInCompany('modifiers', $companyId),
            'items.*.addon_ids' => 'nullable|array',
            'items.*.addon_ids.*' => $this->existsInCompany('addons', $companyId),
            // #35: qo'shimcha soni (oshga 2× go'sht)
            'items.*.addons' => 'nullable|array|max:20',
            'items.*.addons.*.id' => 'required|integer',
            'items.*.addons.*.quantity' => 'required|integer|min:1|max:50',
            'note' => 'nullable|string|max:1000',
        ]);

        if (in_array($order->status, OrderService::TERMINAL_STATUSES, true)) {
            return $this->error('ORDER_NOT_EDITABLE', 'Cannot update an order that is paid, closed, or cancelled.', 422);
        }

        $company = $request->user()->company;

        DB::transaction(function () use ($order, $data, $company, $orderService) {
            // Remove old items; modifier / add-on rows cascade with them. Stol to'plamidan
            // belgilangan qatorlar (#24) bu formada yo'q — ular saqlanadi.
            $order->orderItems()->where('is_table_set', false)->delete();

            $orderService->syncItems($order, $data['items'], $company->id);

            if (array_key_exists('note', $data)) {
                $order->update(['note' => $data['note'] ?? $order->note]);
            }

            // Summa barcha qatorlardan (to'plam qatorlari ham), chegirma qayta cheklanadi
            $orderService->recalculateTotals($order, $company);
        });

        $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);

        // The kitchen display is still showing the old item list. previous
        // status === current status marks a content-only update.
        OrderStatusUpdated::dispatch($order, $order->status);

        return $this->success($order);
    }

    /**
     * #43: ofitsiant paneli — o'z buyurtmalari soni: hozir faol, tayyor, berilgan
     * va bugun jami (bekor qilinganlarsiz).
     */
    /**
     * #39: «Yetkazib berish» bo'limi — botdan kelgan yetkazib berish va olib ketish
     * buyurtmalari: tasdiqlash kutayotganlari, jarayondagilari va bugun yakunlanganlari.
     */
    public function delivery(Request $request): JsonResponse
    {
        $orders = Order::with(['customer:id,name,phone', 'orderItems.menuItem:id,name_uz', 'orderItems.addons', 'orderItems.modifiers', 'branch:id,name', 'confirmedBy:id,name'])
            ->whereNotNull('customer_id')
            ->whereIn('type', ['delivery', 'takeaway'])
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->where(fn ($q) => $q->whereNotIn('status', OrderService::TERMINAL_STATUSES)
                ->orWhere(fn ($q) => $q->whereIn('status', ['paid', 'closed', 'cancelled'])->whereDate('updated_at', now()->toDateString())))
            ->orderBy('created_at')
            ->limit(200)
            ->get();

        return $this->success($orders);
    }

    /** #39: menejer mijozga qo'ng'iroq qilib tasdiqladi — buyurtma oshxonaga tushadi. */
    public function confirm(Request $request, Order $order): JsonResponse
    {
        $updated = DB::transaction(function () use ($order, $request) {
            $locked = Order::lockForUpdate()->findOrFail($order->id);
            if ($locked->status !== 'pending') {
                return false;
            }
            $locked->update(['status' => 'preparing', 'confirmed_at' => now(), 'confirmed_by' => $request->user()->id]);

            return true;
        });

        if (! $updated) {
            return $this->error('ALREADY_CONFIRMED', 'Buyurtma allaqachon tasdiqlangan yoki bekor qilingan.', 422);
        }

        $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);
        OrderStatusUpdated::dispatch($order, 'pending');

        return $this->success($order);
    }

    public function myStats(Request $request): JsonResponse
    {
        $mine = Order::where('user_id', $request->user()->id);
        $byStatus = (clone $mine)->whereIn('status', ['preparing', 'ready', 'served'])
            ->selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status');
        $today = (clone $mine)->whereDate('created_at', now()->toDateString())->where('status', '!=', 'cancelled');

        return $this->success([
            'preparing' => (int) ($byStatus['preparing'] ?? 0),
            'ready' => (int) ($byStatus['ready'] ?? 0),
            'served' => (int) ($byStatus['served'] ?? 0),
            'today_count' => (clone $today)->count(),
            'today_total' => (float) (clone $today)->sum('total'),
        ]);
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

        // #40: bo'limga biriktirilgan oshpaz faqat o'z qismini belgilaydi
        if ($newStatus === 'ready' && app(KitchenService::class)->stationsOf($request->user()) !== null) {
            return $this->kitchenReady($request->merge(['station_id' => null]), $order, app(KitchenService::class));
        }

        DB::transaction(function () use ($order, $newStatus, $orderService) {
            $order->update(['status' => $newStatus]);
            if ($newStatus === 'ready') {
                $order->orderItems()->whereNull('ready_at')->update(['ready_at' => now()]); // #40
            }

            if (in_array($newStatus, OrderService::TERMINAL_STATUSES, true)) {
                $orderService->releaseTableIfIdle($order);
            }
        });

        $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);

        OrderStatusUpdated::dispatch($order, $currentStatus);

        return $this->success($order);
    }

    /**
     * #40: oshxona bo'limi taomlari tayyor. Bo'limga biriktirilgan oshpaz — faqat o'z
     * bo'limlari; boshqalar station_id bilan bitta bo'limni yoki hammasini belgilaydi.
     * Barcha bo'limlar tayyor bo'lganda buyurtma «ready» bo'ladi.
     */
    public function kitchenReady(Request $request, Order $order, KitchenService $kitchen): JsonResponse
    {
        $data = $request->validate(['station_id' => 'nullable|integer']);
        $mine = $kitchen->stationsOf($request->user());
        $stationId = isset($data['station_id']) ? (int) $data['station_id'] : null;

        if ($stationId !== null && $mine !== null && ! in_array($stationId, $mine, true)) {
            return $this->error('FORBIDDEN', 'Bu bo\'lim sizga biriktirilmagan.', 403);
        }
        $stations = $stationId !== null ? [$stationId] : $mine;

        $result = $kitchen->markReady($order, $stations);
        if ($result['previous'] !== 'preparing') {
            return $this->error('INVALID_STATUS_TRANSITION', "Buyurtma allaqachon «{$result['previous']}» holatida.", 422);
        }

        return $this->success($order->fresh()->toBroadcastArray());
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

        // #39: tasdiqlanmagan bot buyurtmasini rad etish vaqt bilan cheklanmaydi
        if ($order->status !== 'pending' && $minutesSinceCreation > $cancelLimitMinutes) {
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

    /**
     * A Rule::exists() scoped to the given company, so a raw `exists:` check
     * (which bypasses the CompanyScope global scope) can never validate an
     * id that belongs to another tenant. When $companyId is null (only
     * possible for a super_admin, who has no company and legitimately works
     * cross-tenant) the check is left unscoped rather than forced to match
     * nothing.
     */
    private function existsInCompany(string $table, ?int $companyId): Exists
    {
        return Rule::exists($table, 'id')->where(function ($query) use ($companyId) {
            if ($companyId !== null) {
                $query->where('company_id', $companyId);
            }
        });
    }
}
