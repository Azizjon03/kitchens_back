<?php

namespace App\Console\Commands;

use App\Services\Telegram\StaffBot;
use Illuminate\Console\Command;

/**
 * #37: xodimlar botini ulash — tokenni .env'ga (TELEGRAM_STAFF_BOT_TOKEN) qo'ygandan
 * keyin bir marta ishga tushiriladi: webhook, buyruqlar va «Ochish» menyu tugmasi.
 */
class TelegramStaffSetup extends Command
{
    protected $signature = 'telegram:staff-setup';

    protected $description = 'Xodimlar botini sozlash (webhook, buyruqlar, menyu tugmasi)';

    public function handle(StaffBot $bot): int
    {
        if (! $bot->configured()) {
            $this->error('TELEGRAM_STAFF_BOT_TOKEN .env da yo\'q.');

            return self::FAILURE;
        }

        $me = $bot->call('getMe');
        if (! ($me['ok'] ?? false)) {
            $this->error('Token noto\'g\'ri: '.($me['description'] ?? 'javob yo\'q'));

            return self::FAILURE;
        }
        $username = $me['result']['username'] ?? '';
        $this->info("Bot: @{$username}");
        if ($bot->username() !== $username) {
            $this->warn("TELEGRAM_STAFF_BOT_USERNAME={$username} ni .env ga yozing (hozir: ".($bot->username() ?? 'bo\'sh').')');
        }

        $steps = [
            'setWebhook' => [
                'url' => $bot->webhookUrl(),
                'secret_token' => $bot->webhookSecret(),
                'allowed_updates' => ['message', 'callback_query'],
                'drop_pending_updates' => true,
            ],
            'setMyCommands' => ['commands' => [
                ['command' => 'start', 'description' => 'Boshlash'],
                ['command' => 'hisobot', 'description' => 'Bugungi hisobot (rahbar, menejer)'],
            ]],
            'setChatMenuButton' => ['menu_button' => [
                'type' => 'web_app', 'text' => 'Ochish', 'web_app' => ['url' => $bot->miniAppUrl()],
            ]],
            'setMyDescription' => ['description' => "Kitchens restoran xodimlari uchun: buyurtmalar, oshxona, hisobotlar.\n\nKirish uchun «Boshlash» ni bosing."],
        ];

        foreach ($steps as $method => $params) {
            $res = $bot->call($method, $params);
            $ok = (bool) ($res['ok'] ?? false);
            $this->line(($ok ? '✓ ' : '✗ ').$method.($ok ? '' : ': '.($res['description'] ?? '')));
            if (! $ok && $method === 'setWebhook') {
                return self::FAILURE;
            }
        }

        $this->info('Webhook: '.$bot->webhookUrl());
        $this->info('Mini App: '.$bot->miniAppUrl());

        return self::SUCCESS;
    }
}
