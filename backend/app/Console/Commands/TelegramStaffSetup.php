<?php

namespace App\Console\Commands;

use App\Services\Telegram\StaffBot;
use Illuminate\Console\Command;

/**
 * #37: xodimlar botini qayta sozlash (webhook, buyruqlar, «Ochish» tugmasi).
 * Odatda super admin paneli buni o'zi qiladi; bu buyruq .env rejimi va zaxira uchun.
 */
class TelegramStaffSetup extends Command
{
    protected $signature = 'telegram:staff-setup';

    protected $description = 'Xodimlar botini sozlash (webhook, buyruqlar, menyu tugmasi)';

    public function handle(StaffBot $bot): int
    {
        if (! $bot->configured()) {
            $this->error("Xodimlar boti tokeni yo'q — super admin panelida kiriting (Xodimlar boti).");

            return self::FAILURE;
        }

        $me = $bot->call('getMe');
        if (! ($me['ok'] ?? false)) {
            $this->error("Token noto'g'ri: ".($me['description'] ?? "javob yo'q"));

            return self::FAILURE;
        }
        $this->info('Bot: @'.($me['result']['username'] ?? ''));

        $failed = false;
        foreach ($bot->setup() as $method => $r) {
            $this->line(($r['ok'] ? '✓ ' : '✗ ').$method.($r['ok'] ? '' : ': '.$r['error']));
            $failed = $failed || ($method === 'setWebhook' && ! $r['ok']);
        }

        $this->info('Webhook: '.$bot->webhookUrl());
        $this->info('Mini App: '.$bot->miniAppUrl());

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
