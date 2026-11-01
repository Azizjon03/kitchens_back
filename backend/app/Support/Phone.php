<?php

namespace App\Support;

/**
 * #42: telefon raqam standarti. Saqlash — E.164 ("+998901234567"); 9 raqamli mahalliy
 * yozuv ("90 123 45 67") +998 bilan to'ldiriladi. Ko'rsatish — "+998 (90) 123-45-67".
 */
final class Phone
{
    public static function normalize(?string $raw): string
    {
        $digits = preg_replace('/\D/', '', (string) $raw);
        if (strlen($digits) === 9) {
            $digits = '998'.$digits;
        }

        return $digits === '' ? '' : '+'.$digits;
    }

    public static function format(?string $raw): string
    {
        $digits = preg_replace('/\D/', '', (string) $raw);
        if (strlen($digits) === 9) {
            $digits = '998'.$digits;
        }
        if (strlen($digits) !== 12 || ! str_starts_with($digits, '998')) {
            return (string) $raw;
        }

        return sprintf('+998 (%s) %s-%s-%s', substr($digits, 3, 2), substr($digits, 5, 3), substr($digits, 8, 2), substr($digits, 10, 2));
    }
}
