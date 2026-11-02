<?php

namespace App\Console\Commands;

use App\Services\Printing\DesktopRelease;
use Illuminate\Console\Command;

/** #62: serverda Windows ilovasining eski o'rnatuvchilarini o'chiradi. */
class DesktopPrune extends Command
{
    protected $signature = 'desktop:prune';

    protected $description = "Windows ilovasining eski o'rnatuvchilarini o'chiradi (oxirgi 3 tasi qoladi)";

    public function handle(): int
    {
        $this->info('O\'chirildi: '.DesktopRelease::prune().' ta fayl');

        return self::SUCCESS;
    }
}
