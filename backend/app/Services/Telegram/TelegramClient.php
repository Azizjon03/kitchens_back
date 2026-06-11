<?php

namespace App\Services\Telegram;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class TelegramClient
{
    private function base(string $token): string
    {
        return "https://api.telegram.org/bot{$token}";
    }

    /**
     * Set the chat menu button to launch the Mini App web app.
     */
    public function setChatMenuButton(string $token, string $webAppUrl, string $text = 'Menyu'): Response
    {
        return Http::post($this->base($token).'/setChatMenuButton', [
            'menu_button' => [
                'type' => 'web_app',
                'text' => $text,
                'web_app' => ['url' => $webAppUrl],
            ],
        ]);
    }

    public function getMe(string $token): Response
    {
        return Http::get($this->base($token).'/getMe');
    }
}
