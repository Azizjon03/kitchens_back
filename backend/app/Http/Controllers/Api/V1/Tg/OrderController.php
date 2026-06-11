<?php

namespace App\Http\Controllers\Api\V1\Tg;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Order;
use App\Models\Table;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'items.*.menu_item_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.weight_kg' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'nullable|array',
            'items.*.addon_ids' => 'nullable|array',
            'note' => 'nullable|string|max:1000',
        ]);

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
            $data['type'] = 'takeaway';
        }

        $order = $orderService->create($data, $company->id, null, $customer->id);

        return $this->success($this->serialize($order->fresh()), 201);
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
