<?php

namespace App\Console\Commands;

use App\Models\TelegramBot;
use App\Services\Telegram\StaffBot;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Console\Command;

/** #26: har 5 daqiqada barcha botlar holatini tekshiradi va uzilganini tiklaydi. */
class TelegramHealthCheck extends Command
{
    protected $signature = 'telegram:health';

    protected $description = 'Telegram botlar webhook holatini tekshirish va avtomatik tiklash';

    public function handle(TelegramBotService $service, StaffBot $staffBot): int
    {
        // #37: xodimlar boti — webhook yo'qolgan bo'lsa qayta o'rnatiladi
        if ($staffBot->configured()) {
            try {
                $this->line(($staffBot->check() ? 'OK ' : 'ERR').' xodimlar boti');
            } catch (\Throwable $e) {
                report($e);
            }
        }

        TelegramBot::with('company')->each(function (TelegramBot $bot) use ($service) {
            try {
                $ok = $service->check($bot);
                $this->line(sprintf('%s @%s: %s', $ok ? 'OK ' : 'ERR', $bot->username, $ok ? 'ulangan' : $bot->last_error));
            } catch (\Throwable $e) {
                // Bitta botdagi xato qolganlarini to'xtatmasin
                report($e);
            }
        });

        return self::SUCCESS;
    }
}
