<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Jobs\SendTelegramMessage;
use App\Models\Order;
use App\Models\TelegramBot;

/**
 * #26: Telegram bildirishnomalari.
 * Restoran guruhiga — yangi TG buyurtma; mijozga — qabul qilindi → tayyor → yo'lda → yetkazildi.
 * Xabarlar navbatga qo'yiladi (SendTelegramMessage), buyurtma oqimini sekinlashtirmaydi.
 * handle* metodlari Laravel event discovery orqali avtomatik ulanadi.
 */
class NotifyTelegram
{
    private const CUSTOMER_TEXT = [
        'ready' => [
            'takeaway' => "✅ Buyurtmangiz #%d tayyor — olib ketishingiz mumkin.",
            'delivery' => "✅ Buyurtmangiz #%d tayyor, tez orada yo'lga chiqadi.",
            'dine_in' => "✅ Buyurtmangiz #%d tayyor.",
        ],
        'delivering' => "🚗 Buyurtmangiz #%d yo'lda.",
        'delivered' => "🎉 Buyurtmangiz #%d yetkazildi. Yoqimli ishtaha!",
        'cancelled' => "❌ Buyurtmangiz #%d bekor qilindi. Savollar bo'lsa restoranga qo'ng'iroq qiling.",
    ];

    public function handleCreated(OrderCreated $event): void
    {
        $order = $event->order;
        $bot = $this->botFor($order);
        if (! $bot) {
            return;
        }
        $order->loadMissing(['customer', 'orderItems.menuItem', 'branch']);

        if ($order->customer?->telegram_id) {
            SendTelegramMessage::dispatch($bot->id, (string) $order->customer->telegram_id,
                sprintf("🧾 Buyurtmangiz #%d qabul qilindi va tayyorlanmoqda.\nJami: <b>%s so'm</b>", $order->id, $this->money($order->total)));
        }

        if ($bot->group_chat_id) {
            SendTelegramMessage::dispatch($bot->id, $bot->group_chat_id, $this->groupText($order));
        }
    }

    public function handleStatus(OrderStatusUpdated $event): void
    {
        $order = $event->order;
        if ($order->status === $event->previousStatus) {
            return;
        }
        $template = self::CUSTOMER_TEXT[$order->status] ?? null;
        if (is_array($template)) {
            $template = $template[$order->type] ?? null;
        }
        if (! $template) {
            return;
        }
        $bot = $this->botFor($order);
        $order->loadMissing('customer');
        if ($bot && $order->customer?->telegram_id) {
            SendTelegramMessage::dispatch($bot->id, (string) $order->customer->telegram_id, sprintf($template, $order->id));
        }
    }

    private function botFor(Order $order): ?TelegramBot
    {
        if (! $order->customer_id) {
            return null; // faqat Telegram mijozlari buyurtmalari
        }
        $bot = TelegramBot::where('company_id', $order->company_id)->first();

        return $bot?->isConnected() ? $bot : null;
    }

    private function groupText(Order $order): string
    {
        $type = ['takeaway' => 'Olib ketish', 'delivery' => 'Yetkazib berish', 'dine_in' => 'Zalda'][$order->type] ?? $order->type;
        $lines = ["🆕 <b>Yangi Telegram buyurtma #{$order->id}</b> — {$type}"];
        if ($order->branch && $order->branch->name !== 'Asosiy filial') {
            $lines[] = '🏠 '.e($order->branch->name);
        }
        foreach ($order->orderItems as $it) {
            $qty = $it->weight_kg ? rtrim(rtrim((string) $it->weight_kg, '0'), '.').' kg' : rtrim(rtrim((string) $it->quantity, '0'), '.').' ta';
            $lines[] = '• '.e($it->menuItem?->name_uz ?? 'Taom')." — {$qty}";
        }
        $lines[] = "💰 Jami: <b>{$this->money($order->total)} so'm</b>";
        if ($order->customer) {
            $lines[] = '👤 '.e($order->customer->name ?? 'Mijoz').($order->customer->phone ? ', '.e(\App\Support\Phone::format($order->customer->phone)) : '');
        }
        if ($order->delivery_address) {
            $lines[] = '📍 '.e($order->delivery_address);
        }
        if ($order->delivery_lat !== null && $order->delivery_lng !== null) {
            $lines[] = "🗺 https://maps.google.com/?q={$order->delivery_lat},{$order->delivery_lng}";
        }
        if ($order->note) {
            $lines[] = '📝 '.e($order->note);
        }

        return implode("\n", $lines);
    }

    private function money(mixed $v): string
    {
        return number_format((float) $v, 0, '.', ' ');
    }
}
