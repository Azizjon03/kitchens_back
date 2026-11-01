<?php

namespace App\Console\Commands;

use App\Models\PrintAgent;
use App\Models\PrintJob;
use App\Services\Printing\PrintAlerts;
use Illuminate\Console\Command;

/** #53: har daqiqada — kompyuter 3 daqiqadan beri ulanmagan va chiqmagan qog'oz bo'lsa, bir marta ogohlantirish */
class PrintAgentHealth extends Command
{
    protected $signature = 'print:health';

    protected $description = 'Oshxona print agentlari holatini tekshirish';

    public function handle(PrintAlerts $alerts): int
    {
        PrintAgent::withoutGlobalScopes()->whereNull('alerted_at')
            ->where(fn ($q) => $q->whereNull('last_seen_at')->orWhere('last_seen_at', '<', now()->subMinutes(3)))
            ->each(function (PrintAgent $agent) use ($alerts) {
                $pending = PrintJob::withoutGlobalScopes()->where('branch_id', $agent->branch_id)
                    ->whereIn('status', ['pending', 'sent'])->where('created_at', '<', now()->subMinute())->count();
                if ($pending === 0) {
                    return;
                }
                $alerts->agentOffline($agent, $pending);
                $agent->forceFill(['alerted_at' => now()])->saveQuietly();
            });

        return self::SUCCESS;
    }
}
