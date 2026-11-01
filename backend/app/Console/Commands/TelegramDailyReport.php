<?php

namespace App\Console\Commands;

use App\Jobs\SendTelegramMessage;
use App\Models\Company;
use App\Models\TelegramBot;
use App\Services\Reports\DailyReport;
use App\Services\Telegram\StaffBot;
use Illuminate\Console\Command;

/**
 * #26/#37: rahbarga kunlik hisobot. Asosiy yo'l — xodimlar boti (Telegram'i ulangan
 * rahbar va menejerlar). Restoranda hali hech kim ulanmagan bo'lsa — eski yo'l:
 * mijozlar botining rahbar chati.
 */
class TelegramDailyReport extends Command
{
    protected $signature = 'telegram:daily-report';

    protected $description = 'Rahbarlarga kunlik hisobot yuborish';

    public function handle(DailyReport $report, StaffBot $staffBot): int
    {
        $today = now();
        $sent = [];

        if ($staffBot->configured()) {
            Company::where('is_active', true)->each(function (Company $company) use ($report, $staffBot, $today, &$sent) {
                $recipients = $staffBot->recipients($company->id, ['company_admin', 'manager']);
                if ($recipients->isEmpty()) {
                    return;
                }
                $text = $report->text($company, $today);
                foreach ($recipients->pluck('telegram_id')->unique() as $chatId) {
                    $staffBot->queue($chatId, $text);
                }
                $sent[$company->id] = true;
            });
        }

        TelegramBot::with('company')->where('status', 'connected')->whereNotNull('owner_chat_id')
            ->each(function (TelegramBot $bot) use ($report, $today, $sent) {
                if (isset($sent[$bot->company_id]) || ! $bot->company) {
                    return;
                }
                SendTelegramMessage::dispatch($bot->id, $bot->owner_chat_id, $report->text($bot->company, $today));
            });

        return self::SUCCESS;
    }
}
