<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Models\Order;
use App\Services\Telegram\StaffBot;

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

        $chefs = $this->bot->recipients($order->company_id, ['chef'], $order->branch_id);
        foreach ($chefs->pluck('telegram_id')->unique() as $chatId) {
            $this->bot->queue($chatId, $text, ['reply_markup' => ['inline_keyboard' => [[
                ['text' => '✅ Tayyor', 'callback_data' => "ready:{$order->id}"],
            ]]]]);
        }

        if ($order->customer_id) {
            $bosses = $this->bot->recipients($order->company_id, ['company_admin', 'manager'], $order->branch_id);
            foreach ($bosses->pluck('telegram_id')->diff($chefs->pluck('telegram_id'))->unique() as $chatId) {
                $this->bot->queue($chatId, "📲 Telegram orqali\n".$text);
            }
        }
    }

    public function handleStatus(OrderStatusUpdated $event): void
    {
        $order = $event->order;
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

    private function orderText(Order $order): string
    {
        $where = $order->table ? '🪑 Stol '.e((string) $order->table->number) : '📦 '.$this->typeName($order->type);
        $lines = ["🆕 <b>Buyurtma #{$order->id}</b> — {$where}"];
        foreach ($order->orderItems as $it) {
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
