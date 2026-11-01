<?php

namespace App\Services\Reports;

use App\Models\Company;
use App\Models\Order;
use App\Models\Payment;
use Carbon\CarbonInterface;

/** #26/#37: rahbar uchun kunlik hisobot matni — tushum, buyurtmalar soni, o'rtacha chek. */
class DailyReport
{
    public function text(Company $company, CarbonInterface $day): string
    {
        $from = $day->copy()->startOfDay();
        $to = $day->copy()->endOfDay();

        $orders = Order::withoutGlobalScopes()->where('company_id', $company->id)
            ->whereBetween('created_at', [$from, $to])->where('status', '!=', 'cancelled')->count();
        $payments = Payment::withoutGlobalScopes()->where('company_id', $company->id)
            ->where('status', 'completed')->whereBetween('paid_at', [$from, $to]);
        $revenue = (float) (clone $payments)->sum('amount') - (float) (clone $payments)->sum('change_amount');
        $paidOrders = (clone $payments)->distinct('order_id')->count('order_id');
        $avg = $paidOrders > 0 ? $revenue / $paidOrders : 0;
        $fmt = fn (float $v) => number_format($v, 0, '.', ' ');

        return implode("\n", [
            '📊 <b>'.e($company->name)." — {$from->format('d.m.Y')} hisobot</b>",
            "💰 Tushum: <b>{$fmt($revenue)} so'm</b>",
            "🧾 Buyurtmalar: <b>{$orders}</b>",
            "📈 O'rtacha chek: <b>{$fmt($avg)} so'm</b>",
        ]);
    }
}
