<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\Telegram\TelegramClient;
use Illuminate\Console\Command;

class TelegramSetup extends Command
{
    protected $signature = 'telegram:setup {company : Company id or slug}';

    protected $description = 'Configure the Telegram bot menu button to open the Mini App for a company';

    public function handle(TelegramClient $client): int
    {
        $arg = $this->argument('company');

        $company = is_numeric($arg)
            ? Company::find($arg)
            : Company::where('slug', $arg)->first();

        if (! $company) {
            $this->error("Company '{$arg}' not found.");

            return self::FAILURE;
        }

        $token = $company->getSetting('telegram_bot_token');

        if (! $token) {
            $this->error("Company '{$company->name}' has no telegram_bot_token in settings_json.");

            return self::FAILURE;
        }

        $frontend = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        $webAppUrl = "{$frontend}/tg?company={$company->slug}";

        // Verify the token.
        $me = $client->getMe($token);
        if (! $me->ok() || ! ($me->json('ok') ?? false)) {
            $this->error('Invalid bot token (getMe failed).');

            return self::FAILURE;
        }
        $this->info('Bot: @'.($me->json('result.username') ?? 'unknown'));

        $res = $client->setChatMenuButton($token, $webAppUrl);

        if ($res->ok() && ($res->json('ok') ?? false)) {
            $this->info("Menu button set to: {$webAppUrl}");

            return self::SUCCESS;
        }

        $this->error('Failed to set menu button: '.$res->body());

        return self::FAILURE;
    }
}
