<?php

namespace App\Console\Commands;

use App\Jobs\SendTelegramMessage;
use App\Models\Order;
use App\Models\Payment;
use App\Models\TelegramBot;
use Illuminate\Console\Command;

/** #26: rahbarga kunlik hisobot — tushum, buyurtmalar soni, o'rtacha chek. */
class TelegramDailyReport extends Command
{
    protected $signature = 'telegram:daily-report';

    protected $description = "Rahbar chatiga kunlik hisobot yuborish";

    public function handle(): int
    {
        $from = now()->startOfDay();
        $to = now()->endOfDay();

        TelegramBot::with('company')->where('status', 'connected')->whereNotNull('owner_chat_id')
            ->each(function (TelegramBot $bot) use ($from, $to) {
                $orders = Order::withoutGlobalScopes()->where('company_id', $bot->company_id)
                    ->whereBetween('created_at', [$from, $to])->where('status', '!=', 'cancelled')->count();
                $payments = Payment::withoutGlobalScopes()->where('company_id', $bot->company_id)
                    ->where('status', 'completed')->whereBetween('paid_at', [$from, $to]);
                $revenue = (float) (clone $payments)->sum('amount') - (float) (clone $payments)->sum('change_amount');
                $paidOrders = (clone $payments)->distinct('order_id')->count('order_id');
                $avg = $paidOrders > 0 ? $revenue / $paidOrders : 0;
                $fmt = fn (float $v) => number_format($v, 0, '.', ' ');

                SendTelegramMessage::dispatch($bot->id, $bot->owner_chat_id, implode("\n", [
                    "📊 <b>".e($bot->company->name)." — {$from->format('d.m.Y')} hisobot</b>",
                    "💰 Tushum: <b>{$fmt($revenue)} so'm</b>",
                    "🧾 Buyurtmalar: <b>{$orders}</b>",
                    "📈 O'rtacha chek: <b>{$fmt($avg)} so'm</b>",
                ]));
            });

        return self::SUCCESS;
    }
}
