<?php

namespace App\Jobs;

use App\Models\TelegramBot;
use App\Services\Telegram\BotConversation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** #26: webhook update'i navbatda ishlanadi — webhook javobi tez, xato bo'lsa qayta urinadi. */
class ProcessTelegramUpdate implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var array<int, int> */
    public array $backoff = [5, 30, 120, 600];

    /** @param array<string, mixed> $update */
    public function __construct(public int $botId, public array $update)
    {
    }

    public function handle(BotConversation $conversation): void
    {
        $bot = TelegramBot::find($this->botId);
        if ($bot) {
            $conversation->handle($bot, $this->update);
        }
    }
}
