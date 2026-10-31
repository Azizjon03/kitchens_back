<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TableTemplate;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Stol to'plami (#24): shablonli stolda oldindan turgan narsalardan nechtasi ishlatilganini
 * ofitsiant/kassir belgilaydi. Faqat belgilangani buyurtmaga `is_table_set` qator bo'lib
 * tushadi (joriy menyu narxida); KDS'ga hech narsa yuborilmaydi.
 */
class TableSetController extends Controller
{
    use ApiResponse;

    public function show(Order $order): JsonResponse
    {
        return $this->success($this->payload($order));
    }

    public function update(Request $request, Order $order, OrderService $orderService): JsonResponse
    {
        $template = $this->templateFor($order);

        if (! $template) {
            return $this->error('NO_TABLE_SET', "Bu stolda oldindan qo'yilgan narsalar yo'q.", 422);
        }
        if (in_array($order->status, OrderService::TERMINAL_STATUSES, true)) {
            return $this->error('ORDER_NOT_EDITABLE', "Yopilgan buyurtmani o'zgartirib bo'lmaydi.", 422);
        }

        $data = $request->validate([
            'items' => 'present|array',
            'items.*.menu_item_id' => 'required|integer|distinct',
            'items.*.quantity' => 'required|integer|min:0',
        ]);

        $placed = $template->items->keyBy('menu_item_id');
        $errors = [];
        foreach ($data['items'] as $i => $line) {
            $slot = $placed->get($line['menu_item_id']);
            if (! $slot) {
                $errors["items.{$i}.menu_item_id"] = "Bu narsa stol to'plamida yo'q.";
            } elseif ($line['quantity'] > $slot->quantity) {
                $errors["items.{$i}.quantity"] = "Stolda {$slot->quantity} ta qo'yilgan — undan ko'p belgilab bo'lmaydi.";
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        $company = $request->user()->company;

        DB::transaction(function () use ($order, $data, $placed, $orderService, $company) {
            // Qayta belgilash — avvalgisini almashtiradi
            $order->orderItems()->where('is_table_set', true)->delete();

            foreach ($data['items'] as $line) {
                if ($line['quantity'] < 1) {
                    continue;
                }
                $menuItem = $placed->get($line['menu_item_id'])->menuItem;
                $unit = $orderService->decimal($menuItem->price, 2);
                OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $unit,
                    'total_price' => bcmul($unit, (string) $line['quantity'], 2),
                    'is_table_set' => true,
                ]);
            }

            $orderService->recalculateTotals($order, $company);
        });

        return $this->success($this->payload($order->fresh()));
    }

    private function templateFor(Order $order): ?TableTemplate
    {
        $templateId = $order->table?->table_template_id;

        return $templateId
            ? TableTemplate::with('items.menuItem')->find($templateId)
            : null;
    }

    private function payload(Order $order): array
    {
        $template = $this->templateFor($order);
        $used = $order->orderItems()->where('is_table_set', true)->pluck('quantity', 'menu_item_id');

        return [
            'template' => $template ? ['id' => $template->id, 'name' => $template->name] : null,
            'items' => $template ? $template->items->map(fn ($slot) => [
                'menu_item_id' => $slot->menu_item_id,
                'name_uz' => $slot->menuItem?->name_uz,
                'name_ru' => $slot->menuItem?->name_ru,
                'price' => $slot->menuItem?->price,
                'placed' => $slot->quantity,
                'used' => (int) ($used[$slot->menu_item_id] ?? 0),
            ])->values() : [],
            'order_total' => $order->total,
        ];
    }
}
