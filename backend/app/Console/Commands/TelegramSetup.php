<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Console\Command;

/**
 * Botni server buyrug'i bilan qayta sozlash (webhook + menyu tugmasi + buyruqlar).
 * Odatda kerak emas — korxona rahbari panel → "Telegram bot" orqali ulaydi (#26).
 */
class TelegramSetup extends Command
{
    protected $signature = 'telegram:setup {company : Company id or slug}';

    protected $description = 'Restoran botini qayta sozlash (webhook, Mini App menyu tugmasi)';

    public function handle(TelegramBotService $service): int
    {
        $arg = $this->argument('company');
        $company = is_numeric($arg) ? Company::find($arg) : Company::where('slug', $arg)->first();

        if (! $company) {
            $this->error("Company '{$arg}' not found.");

            return self::FAILURE;
        }

        $bot = $company->telegramBot;
        if (! $bot) {
            $token = $company->getSetting('telegram_bot_token');
            if (! $token) {
                $this->error("'{$company->name}' uchun bot ulanmagan. Panel → Telegram bot orqali ulang.");

                return self::FAILURE;
            }
            $bot = $service->connect($company, $token);
        } elseif (! $service->configure($bot->setRelation('company', $company))) {
            $this->error('Sozlab bo\'lmadi: '.$bot->last_error);

            return self::FAILURE;
        }

        $this->info("@{$bot->username} sozlandi. Webhook: {$bot->webhookUrl()}");

        return self::SUCCESS;
    }
}
