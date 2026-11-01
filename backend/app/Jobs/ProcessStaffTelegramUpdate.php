<?php

namespace App\Jobs;

use App\Services\Telegram\StaffBotConversation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** #37: xodimlar boti update'i navbatda ishlanadi. */
class ProcessStaffTelegramUpdate implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [5, 30];

    /** @param array<string, mixed> $update */
    public function __construct(public array $update)
    {
    }

    public function handle(StaffBotConversation $conversation): void
    {
        $conversation->handle($this->update);
    }
}
