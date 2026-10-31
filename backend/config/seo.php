<?php

// #27: SEO — qidiruv tizimlari tasdiqlash kodlari va platforma aloqa ma'lumotlari.
return [
    'google_verification' => env('GOOGLE_SITE_VERIFICATION'),
    'yandex_verification' => env('YANDEX_VERIFICATION'),
    'contact_phone' => env('PLATFORM_CONTACT_PHONE'),
    'contact_telegram' => env('PLATFORM_CONTACT_TELEGRAM'), // username, @ siz
    'site_url' => rtrim((string) env('FRONTEND_URL', env('APP_URL', 'https://kitchens.uz')), '/'),
];
