<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// #26: Telegram botlar — holatni tekshirish/tiklash va rahbarga kunlik hisobot
// (production: cron `* * * * * php artisan schedule:run` va queue worker kerak)
Schedule::command('telegram:health')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('telegram:daily-report')->dailyAt('23:00');
Schedule::command('print:health')->everyMinute()->withoutOverlapping(); // #53
