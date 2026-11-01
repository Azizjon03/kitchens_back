<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Models\Order;
use App\Services\Telegram\StaffBot;
use App\Support\Phone;

/**
 * #37: xodimlar botidagi bildirishnomalar (Telegram'i ulangan xodimlarga):
 * - yangi buyurtma → oshpazlarga, «✅ Tayyor» tugmasi bilan;
 * - Telegram mijoz buyurtmasi → rahbar va menejerlarga;
 * - buyurtma tayyor → uni ochgan ofitsiantga.
 * handle* metodlari Laravel event discovery orqali avtomatik ulanadi.
 */
class NotifyStaff
{
    public function __construct(private StaffBot $bot)
    {
    }

    public function handleCreated(OrderCreated $event): void
    {
        if (! $this->bot->configured()) {
            return;
        }
        $order = $event->order;
        $order->loadMissing(['table', 'customer', 'orderItems.menuItem', 'orderItems.addons']);
        $text = $this->orderText($order);
        if ($text === null) {
            return; // oshxonaga tegishli taom yo'q (faqat stol to'plami)
        }

        // #39: tasdiqlanmagan bot buyurtmasi oshxonaga hali tushmaydi — rahbar/menejer tasdiqlaydi
        if ($order->status !== 'pending') {
            $this->notifyChefs($order, $text);
        }

        if ($order->customer_id) {
            $bosses = $this->bot->recipients($order->company_id, ['company_admin', 'manager'], $order->branch_id);
            $head = $order->status === 'pending' ? "📲 <b>Telegram buyurtma — tasdiqlash kerak</b>" : '📲 Telegram orqali';
            $who = $order->customer ? '👤 '.e($order->customer->name ?? 'Mijoz').($order->customer->phone ? ', '.e(Phone::format($order->customer->phone)) : '') : '';
            $where = $order->delivery_address ? "\n📍 ".e($order->delivery_address) : '';
            foreach ($bosses->pluck('telegram_id')->unique() as $chatId) {
                $this->bot->queue($chatId, "{$head}\n{$text}\n{$who}{$where}");
            }
        }
    }

    /** Oshpazlarga — faqat o'z bo'limi taomlari, «✅ Tayyor» tugmasi bilan (#40). */
    private function notifyChefs(Order $order, string $text): void
    {
        // #40: oshpazga faqat o'z bo'limi taomlari (bo'lim biriktirilmagan — hammasi)
        $chefs = $this->bot->recipients($order->company_id, ['chef'], $order->branch_id)->load('kitchenStations:id');
        $sent = [];
        foreach ($chefs as $chef) {
            if (isset($sent[$chef->telegram_id])) {
                continue;
            }
            $stations = $chef->kitchenStations->pluck('id')->map(fn ($id) => (int) $id)->all();
            $chefText = $stations === [] ? $text : $this->orderText($order, $stations);
            if ($chefText === null) {
                continue; // bu buyurtmada uning bo'limi taomi yo'q
            }
            $this->bot->queue($chef->telegram_id, $chefText, ['reply_markup' => ['inline_keyboard' => [[
                ['text' => '✅ Tayyor', 'callback_data' => "ready:{$order->id}"],
            ]]]]);
            $sent[$chef->telegram_id] = true;
        }
    }

    public function handleStatus(OrderStatusUpdated $event): void
    {
        $order = $event->order;
        // #39: menejer tasdiqladi — endi oshpazlarga
        if ($event->previousStatus === 'pending' && $order->status === 'preparing' && $this->bot->configured()) {
            $order->loadMissing(['table', 'customer', 'orderItems.menuItem', 'orderItems.addons']);
            if ($text = $this->orderText($order)) {
                $this->notifyChefs($order, $text);
            }

            return;
        }
        if (! $this->bot->configured() || $order->status !== 'ready' || $event->previousStatus === 'ready') {
            return;
        }
        $order->loadMissing(['table', 'user']);
        $waiter = $order->user;
        if (! $waiter || ! $waiter->telegram_id || ! $waiter->is_active || $waiter->role !== 'waiter') {
            return;
        }
        $where = $order->table ? 'Stol '.e((string) $order->table->number) : $this->typeName($order->type);
        $this->bot->queue($waiter->telegram_id, "✅ <b>#{$order->id} tayyor</b> — {$where}. Olib boring.");
    }

    /**
     * @param  array<int, int>|null  $stations  faqat shu bo'limlar taomlari; null — hammasi
     */
    private function orderText(Order $order, ?array $stations = null): ?string
    {
        $items = $order->orderItems->reject(fn ($it) => $it->is_table_set)
            ->filter(fn ($it) => $stations === null || in_array((int) $it->kitchen_station_id, $stations, true));
        if ($items->isEmpty()) {
            return null;
        }
        $where = $order->table ? '🪑 Stol '.e((string) $order->table->number) : '📦 '.$this->typeName($order->type);
        $lines = ["🆕 <b>Buyurtma #{$order->id}</b> — {$where}"];
        foreach ($items as $it) {
            $qty = $it->weight_kg
                ? rtrim(rtrim((string) $it->weight_kg, '0'), '.').' kg'
                : rtrim(rtrim((string) $it->quantity, '0'), '.').' ta';
            $line = '• '.e($it->menuItem?->name_uz ?? 'Taom')." — {$qty}";
            $addons = $it->addons->map(function ($a) {
                $q = (int) ($a->pivot->quantity ?? 1);

                return e((string) $a->name_uz).($q > 1 ? " ×{$q}" : '');
            })->filter()->implode(', ');
            if ($addons !== '') {
                $line .= "\n   + {$addons}";
            }
            if (! empty($it->note)) {
                $line .= "\n   📝 ".e($it->note);
            }
            $lines[] = $line;
        }
        if ($order->note) {
            $lines[] = '📝 '.e($order->note);
        }

        return implode("\n", $lines);
    }

    private function typeName(string $type): string
    {
        return ['takeaway' => 'Olib ketish', 'delivery' => 'Yetkazib berish', 'dine_in' => 'Zalda'][$type] ?? $type;
    }
}
