<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // #26: restoran botlari — webhook manzili (API) va Mini App manzili (SPA)
    'telegram' => [
        'webhook_base' => env('TELEGRAM_WEBHOOK_BASE', env('APP_URL')),
        'frontend_url' => env('FRONTEND_URL', env('APP_URL')),
        // #37: platformaning bitta xodimlar boti (barcha restoranlar uchun)
        'staff_token' => env('TELEGRAM_STAFF_BOT_TOKEN'),
        'staff_username' => env('TELEGRAM_STAFF_BOT_USERNAME'),
        // Birinchi kirishda bot orqali tasdiqlash kodi. Boshlang'ich bosqichda o'chiq:
        // xodim botda telefon + parol bilan bir marta kiradi, vebda kirish o'zgarmaydi.
        'login_code' => (bool) env('TELEGRAM_LOGIN_CODE', false),
    ],

];
