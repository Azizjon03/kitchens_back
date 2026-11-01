<?php

namespace App\Services;

use App\Events\OrderStatusUpdated;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * #40: oshxona bo'limlari. Taom bo'limi: taomning o'zida → kategoriyasida → ota
 * kategoriyada. Har bo'lim o'z qatorlarini «tayyor» qiladi; oshxonaga tegishli barcha
 * qatorlar tayyor bo'lganda buyurtma preparing → ready.
 */
class KitchenService
{
    public function stationFor(MenuItem $item): ?int
    {
        if ($item->kitchen_station_id) {
            return $item->kitchen_station_id;
        }
        $category = Category::withoutGlobalScopes()->find($item->category_id);
        for ($depth = 0; $category && $depth < 5; $depth++) {
            if ($category->kitchen_station_id) {
                return $category->kitchen_station_id;
            }
            $category = $category->parent_id ? Category::withoutGlobalScopes()->find($category->parent_id) : null;
        }

        return null;
    }

    /**
     * Oshpazning bo'limlari; null — cheklov yo'q (hammasi).
     *
     * @return array<int, int>|null
     */
    public function stationsOf(User $user): ?array
    {
        if (! $user->hasRole('chef')) {
            return null;
        }
        $ids = $user->kitchenStations()->pluck('kitchen_stations.id')->map(fn ($id) => (int) $id)->all();

        return $ids === [] ? null : $ids;
    }

    /**
     * Qatorlarni tayyor deb belgilaydi. $stationIds null — barcha qatorlar.
     *
     * @param  array<int, int>|null  $stationIds
     * @return array{marked: int, order_ready: bool, previous: string}
     */
    public function markReady(Order $order, ?array $stationIds): array
    {
        $result = DB::transaction(function () use ($order, $stationIds) {
            $locked = Order::withoutGlobalScopes()->lockForUpdate()->findOrFail($order->id);
            $previous = $locked->status;
            if ($previous !== 'preparing') {
                return ['marked' => 0, 'order_ready' => false, 'previous' => $previous];
            }

            $kitchen = OrderItem::where('order_id', $locked->id)->where('is_table_set', false);
            $marked = (clone $kitchen)->whereNull('ready_at')
                ->when($stationIds !== null, fn ($q) => $q->whereIn('kitchen_station_id', $stationIds))
                ->update(['ready_at' => now()]);

            $allReady = ! (clone $kitchen)->whereNull('ready_at')->exists();
            if ($allReady) {
                $locked->update(['status' => 'ready']);
            }

            return ['marked' => $marked, 'order_ready' => $allReady, 'previous' => $previous];
        });

        if ($result['marked'] > 0 || $result['order_ready']) {
            $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);
            // Qisman tayyor — status o'zgarmaydi, lekin KDS ekranlari yangilanadi
            OrderStatusUpdated::dispatch($order, $result['order_ready'] ? 'preparing' : $order->status);
        }

        return $result;
    }
}
