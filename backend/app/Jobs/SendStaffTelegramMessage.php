<?php

namespace App\Jobs;

use App\Services\Telegram\TelegramClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** #37: xodimlar boti xabari navbat orqali — Telegram vaqtincha javob bermasa qayta urinadi. */
class SendStaffTelegramMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var array<int, int> */
    public array $backoff = [10, 60, 300, 900];

    /** @param array<string, mixed> $extra */
    public function __construct(public string $chatId, public string $text, public array $extra = [])
    {
    }

    public function handle(TelegramClient $client): void
    {
        $token = config('services.telegram.staff_token');
        if (! $token) {
            return;
        }
        $res = $client->sendMessage($token, $this->chatId, $this->text, $this->extra);

        // 403 — xodim botni bloklagan, 400 — chat yo'q: qayta urinish befoyda
        if (! $res->json('ok') && ($res->status() === 429 || $res->serverError())) {
            $this->release($this->backoff[min($this->attempts() - 1, count($this->backoff) - 1)]);
        }
    }
}
