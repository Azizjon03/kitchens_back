<?php

namespace App\Services\Telegram;

class InitDataValidator
{
    /**
     * Validate a Telegram Mini App `initData` string against a bot token and
     * return the parsed payload (with the `user` field decoded) on success,
     * or null if the signature is invalid / expired.
     *
     * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
     *
     * @return array<string, mixed>|null
     */
    public function validate(string $initData, string $botToken, int $maxAgeSeconds = 86400): ?array
    {
        parse_str($initData, $params);

        if (empty($params['hash']) || ! is_string($params['hash'])) {
            return null;
        }

        $providedHash = $params['hash'];
        unset($params['hash']);

        // Build the data-check-string: "key=value" pairs sorted by key, joined by \n.
        ksort($params);
        $pairs = [];
        foreach ($params as $key => $value) {
            $pairs[] = $key.'='.$value;
        }
        $dataCheckString = implode("\n", $pairs);

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $computedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (! hash_equals($computedHash, $providedHash)) {
            return null;
        }

        // Reject stale data.
        if (! empty($params['auth_date'])) {
            $authDate = (int) $params['auth_date'];
            if ($authDate > 0 && (time() - $authDate) > $maxAgeSeconds) {
                return null;
            }
        }

        if (isset($params['user']) && is_string($params['user'])) {
            $decoded = json_decode($params['user'], true);
            if (is_array($decoded)) {
                $params['user'] = $decoded;
            }
        }

        return $params;
    }
}
