<?php

namespace App\Services\Printing;

use App\Models\PrintAgent;
use App\Models\PrintJob;
use App\Services\Telegram\StaffBot;

/** #53: printer yoki kompyuter ishlamasa — xodimlar botida rahbar va menejerga xabar */
class PrintAlerts
{
    public function __construct(private StaffBot $bot)
    {
    }

    public function jobFailed(PrintJob $job): void
    {
        $what = $job->order_id ? "#{$job->order_id} buyurtma qog'ozi" : 'Sinov cheki';
        $this->notify($job->company_id, $job->branch_id,
            "🖨 <b>{$what} chiqmadi</b>\nPrinter: ".e($job->printer?->name ?? '')." ({$job->printer?->ip})\nXato: ".e((string) $job->error)
            ."\nPrinter yoqilganini, qog'oz borligini va tarmoq kabelini tekshiring.");
    }

    public function agentOffline(PrintAgent $agent, int $pending): void
    {
        $this->notify($agent->company_id, $agent->branch_id,
            "🖨 <b>Oshxona kompyuteri aloqada emas</b>\n«".e($agent->name)."» ".($agent->last_seen_at?->diffForHumans() ?? 'hech qachon')." ulanmagan."
            .($pending ? "\nChiqmagan qog'ozlar: {$pending} ta." : '')."\nKompyuter yoqilganini va internetni tekshiring.");
    }

    private function notify(int $companyId, int $branchId, string $text): void
    {
        foreach ($this->bot->recipients($companyId, ['company_admin', 'manager'], $branchId)->pluck('telegram_id')->unique() as $chatId) {
            $this->bot->queue($chatId, $text);
        }
    }
}
