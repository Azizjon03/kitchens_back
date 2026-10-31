<?php

namespace App\Jobs;

use App\Models\TelegramBot;
use App\Services\Telegram\TelegramClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * #26: bildirishnoma navbat orqali — Telegram vaqtincha javob bermasa xabar
 * yo'qolmaydi (5 marta, oshib boruvchi kutish bilan qayta yuboriladi).
 */
class SendTelegramMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var array<int, int> */
    public array $backoff = [10, 60, 300, 900];

    /** @param array<string, mixed> $extra */
    public function __construct(public int $botId, public string $chatId, public string $text, public array $extra = [])
    {
    }

    public function handle(TelegramClient $client): void
    {
        $bot = TelegramBot::find($this->botId);
        if (! $bot) {
            return;
        }
        $res = $client->sendMessage($bot->token, $this->chatId, $this->text, $this->extra);

        // 403 — mijoz botni bloklagan, 400 — chat yo'q: qayta urinish befoyda
        if (! $res->json('ok') && ($res->status() === 429 || $res->serverError())) {
            $this->release($this->backoff[min($this->attempts() - 1, count($this->backoff) - 1)]);
        }
    }
}
