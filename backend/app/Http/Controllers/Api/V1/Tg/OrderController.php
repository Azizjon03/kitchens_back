<?php

namespace App\Http\Controllers\Api\V1\Tg;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Order;
use App\Models\Table;
use App\Services\OrderService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    use ApiResponse;

    public function store(Request $request, OrderService $orderService): JsonResponse
    {
        $company = $request->attributes->get('tg_company');
        $customer = $request->attributes->get('tg_customer');

        $data = $request->validate([
            'branch_id' => 'nullable|integer',
            'table_id' => 'nullable|integer',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => [
                'required',
                'integer',
                // Scoped to this company so a stale/tampered cart can't
                // reference another tenant's menu item id (would otherwise
                // be a 404 from findOrFail deep inside OrderService instead
                // of a clean 422 here).
                Rule::exists('menu_items', 'id')->where(fn ($query) => $query->where('company_id', $company->id)),
            ],
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.modifier_ids.*' => 'integer',
            'items.*.addon_ids' => 'nullable|array',
            'items.*.addon_ids.*' => 'integer',
            // #35: qo'shimcha soni (oshga 2× go'sht)
            'items.*.addons' => 'nullable|array|max:20',
            'items.*.addons.*.id' => 'required|integer',
            'items.*.addons.*.quantity' => 'required|integer|min:1|max:50',
            'note' => 'nullable|string|max:1000',
            // #26: yetkazib berish — manzil yoki xarita nuqtasi (bot ro'yxatidagi joylashuv avtomatik)
            'type' => 'nullable|in:takeaway,delivery',
            'delivery_address' => 'nullable|string|max:255',
            'delivery_lat' => 'nullable|numeric|between:-90,90',
            'delivery_lng' => 'nullable|numeric|between:-180,180',
            // #39: saqlangan manzil yoki yangisini saqlash («Uy», «Ish», ...)
            'address_id' => 'nullable|integer',
            'save_address' => 'nullable|boolean',
            'address_label' => 'nullable|string|max:40',
            // #26: tarmoq uzilib qayta yuborilsa ikki buyurtma bo'lmasin
            'client_key' => 'nullable|string|max:64',
        ]);

        if (! empty($data['client_key'])) {
            $existing = Order::where('company_id', $company->id)->where('client_key', $data['client_key'])->first();
            if ($existing) {
                abort_unless($existing->customer_id === $customer->id, 409, 'Duplicate client key.');

                return $this->success($this->serialize($existing), 200);
            }
        }

        // Determine branch/type. A table (from a QR deep link) forces dine-in.
        if (! empty($data['table_id'])) {
            $table = Table::where('company_id', $company->id)->find($data['table_id']);
            if (! $table) {
                return $this->error('TABLE_NOT_FOUND', 'Table not found.', 422);
            }
            $data['branch_id'] = $table->branch_id;
            $data['type'] = 'dine_in';
        } else {
            $branch = Branch::where('company_id', $company->id)
                ->where('is_active', true)
                ->find($data['branch_id'] ?? null);
            if (! $branch) {
                return $this->error('BRANCH_REQUIRED', 'A valid branch is required for takeaway orders.', 422);
            }
            $data['branch_id'] = $branch->id;
            $data['type'] = ($data['type'] ?? null) === 'delivery' ? 'delivery' : 'takeaway';
        }

        $saveAddress = null;
        if ($data['type'] === 'delivery') {
            if (! empty($data['address_id'])) {
                $saved = $customer->addresses()->find($data['address_id']);
                if (! $saved) {
                    return $this->error('ADDRESS_NOT_FOUND', 'Manzil topilmadi. Qaytadan tanlang.', 422);
                }
                $data['delivery_address'] = $saved->address;
                $data['delivery_lat'] = $saved->latitude;
                $data['delivery_lng'] = $saved->longitude;
                $saved->update(['last_used_at' => now()]);
            } elseif (empty($data['delivery_address']) && ! isset($data['delivery_lat'])) {
                // Eski Mini App: ro'yxatdan o'tishdagi joylashuv
                $data['delivery_lat'] = $customer->latitude;
                $data['delivery_lng'] = $customer->longitude;
            }
            if (empty($data['delivery_address']) && $data['delivery_lat'] === null) {
                return $this->error('ADDRESS_REQUIRED', 'Yetkazib berish uchun manzil yoki joylashuv kerak.', 422);
            }
            if (empty($data['address_id']) && ! empty($data['save_address'])) {
                $saveAddress = [
                    'label' => trim((string) ($data['address_label'] ?? '')) ?: 'Manzil',
                    'address' => $data['delivery_address'] ?? null,
                    'latitude' => $data['delivery_lat'] ?? null,
                    'longitude' => $data['delivery_lng'] ?? null,
                ];
            }
            if (! empty($data['delivery_address'])) {
                $customer->update(['address' => $data['delivery_address']]);
            }
        } else {
            unset($data['delivery_address'], $data['delivery_lat'], $data['delivery_lng']);
        }
        unset($data['address_id'], $data['save_address'], $data['address_label']);

        // #39: stol QR'sidan bo'lmagan bot buyurtmasi — menejer qo'ng'iroq qilib tasdiqlaydi
        if ($data['type'] !== 'dine_in') {
            $data['status'] = 'pending';
        }

        try {
            $order = $orderService->create($data, $company->id, null, $customer->id);
        } catch (UniqueConstraintViolationException) {
            // Bir vaqtda ikki marta yuborilgan (client_key) — birinchisini qaytaramiz
            $order = Order::where('company_id', $company->id)->where('client_key', $data['client_key'])->firstOrFail();

            return $this->success($this->serialize($order), 200);
        }

        if ($saveAddress) {
            // Bir xil nomli manzil yangilanadi («Uy» ikkita bo'lmaydi)
            $customer->addresses()->updateOrCreate(['label' => $saveAddress['label']], $saveAddress + ['last_used_at' => now()]);
        }

        return $this->success($this->serialize($order->fresh()), 201);
    }

    /** #39: saqlangan manzillar. Ro'yxatdan o'tishdagi joylashuv birinchi marta «Uy» bo'ladi. */
    public function addresses(Request $request): JsonResponse
    {
        $customer = $request->attributes->get('tg_customer');
        if ($customer->latitude !== null && ! $customer->addresses()->exists()) {
            $customer->addresses()->create([
                'label' => 'Uy', 'address' => $customer->address,
                'latitude' => $customer->latitude, 'longitude' => $customer->longitude, 'last_used_at' => now(),
            ]);
        }

        return $this->success($customer->addresses()->get(['id', 'label', 'address', 'latitude', 'longitude']));
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $customer = $request->attributes->get('tg_customer');
        $data = $request->validate([
            'label' => 'required|string|max:40',
            'address' => 'nullable|string|max:255|required_without:latitude',
            'latitude' => 'nullable|numeric|between:-90,90|required_with:longitude',
            'longitude' => 'nullable|numeric|between:-180,180|required_with:latitude',
        ], ['address.required_without' => 'Manzilni yozing yoki joylashuvni yuboring.']);
        if ($customer->addresses()->count() >= 10) {
            return $this->error('TOO_MANY_ADDRESSES', "Ko'pi bilan 10 ta manzil saqlanadi — keraksizini o'chiring.", 422);
        }
        $address = $customer->addresses()->updateOrCreate(['label' => trim($data['label'])], $data + ['last_used_at' => now()]);

        return $this->success($address->only(['id', 'label', 'address', 'latitude', 'longitude']), 201);
    }

    public function destroyAddress(Request $request, int $address): JsonResponse
    {
        $customer = $request->attributes->get('tg_customer');
        $customer->addresses()->whereKey($address)->delete();

        return $this->success(null);
    }

    /** #26: bot orqali ro'yxatdan o'tgan mijoz ma'lumotlari — Mini App manzilni oldindan to'ldiradi */
    public function me(Request $request): JsonResponse
    {
        $customer = $request->attributes->get('tg_customer');

        return $this->success([
            'name' => $customer->name,
            'phone' => $customer->phone,
            'address' => $customer->address,
            'latitude' => $customer->latitude,
            'longitude' => $customer->longitude,
            'registered' => $customer->isRegistered(),
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $company = $request->attributes->get('tg_company');
        $customer = $request->attributes->get('tg_customer');

        abort_unless(
            $order->company_id === $company->id && $order->customer_id === $customer->id,
            404,
        );

        return $this->success($this->serialize($order));
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Order $order): array
    {
        $order->loadMissing(['table', 'orderItems.menuItem']);

        return [
            'id' => $order->id,
            'type' => $order->type,
            'status' => $order->status,
            'subtotal' => $order->subtotal,
            'service_charge_amount' => $order->service_charge_amount,
            'total' => $order->total,
            'delivery_address' => $order->delivery_address,
            'created_at' => optional($order->created_at)->toIso8601String(),
            'table' => $order->table ? ['id' => $order->table->id, 'number' => $order->table->number] : null,
            'items' => $order->orderItems->map(fn ($it) => [
                'name_uz' => $it->menuItem?->name_uz,
                'name_ru' => $it->menuItem?->name_ru,
                'quantity' => $it->quantity,
                'weight_kg' => $it->weight_kg,
                'total_price' => $it->total_price,
            ])->values(),
        ];
    }
}
