<?php

namespace App\Services\Telegram;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Telegram Bot API. Vaqtinchalik xatolarda (tarmoq, 429, 5xx) 3 marta qayta
 * urinadi (200ms → 400ms → 800ms); 401/400 kabi doimiy xatolar darhol qaytadi.
 */
class TelegramClient
{
    private function http(): PendingRequest
    {
        return Http::timeout(10)->retry(
            3,
            fn (int $attempt) => 200 * (2 ** ($attempt - 1)),
            fn (\Throwable $e) => $e instanceof ConnectionException
                || ($e instanceof RequestException && ($e->response->status() === 429 || $e->response->serverError())),
            throw: false,
        );
    }

    /** @param array<string, mixed> $params */
    public function call(string $token, string $method, array $params = []): Response
    {
        return $this->http()->asJson()->post("https://api.telegram.org/bot{$token}/{$method}", $params);
    }

    public function getMe(string $token): Response
    {
        return $this->call($token, 'getMe');
    }

    public function setWebhook(string $token, string $url, string $secret): Response
    {
        return $this->call($token, 'setWebhook', [
            'url' => $url,
            'secret_token' => $secret,
            'allowed_updates' => ['message', 'my_chat_member'],
            'drop_pending_updates' => false,
        ]);
    }

    public function deleteWebhook(string $token): Response
    {
        return $this->call($token, 'deleteWebhook');
    }

    public function getWebhookInfo(string $token): Response
    {
        return $this->call($token, 'getWebhookInfo');
    }

    /** Set the chat menu button to launch the Mini App web app. */
    public function setChatMenuButton(string $token, string $webAppUrl, string $text = 'Menyu'): Response
    {
        return $this->call($token, 'setChatMenuButton', [
            'menu_button' => ['type' => 'web_app', 'text' => $text, 'web_app' => ['url' => $webAppUrl]],
        ]);
    }

    /** @param array<int, array{command: string, description: string}> $commands */
    public function setMyCommands(string $token, array $commands): Response
    {
        return $this->call($token, 'setMyCommands', ['commands' => $commands]);
    }

    /** @param array<string, mixed> $extra */
    public function sendMessage(string $token, string|int $chatId, string $text, array $extra = []): Response
    {
        return $this->call($token, 'sendMessage', ['chat_id' => $chatId, 'text' => $text, 'parse_mode' => 'HTML'] + $extra);
    }
}
