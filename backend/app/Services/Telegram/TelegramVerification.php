<?php

namespace App\Services\Telegram;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * #37: birinchi kirishda Telegram orqali tasdiqlash. Parol to'g'ri bo'lgandan keyin
 * rasmiy xodimlar boti 6 raqamli kod yuboradi; kod to'g'ri kiritilsa akkaunt shu
 * Telegram'ga bog'lanadi va keyingi kirishlarda kod so'ralmaydi.
 *
 * Holat keshda (nonce bo'yicha): kimga (user_ids), qaysi chatga (chat_id), kod xeshi, urinishlar.
 * - Mini App: chat initData'dan ma'lum — kod darhol yuboriladi.
 * - Veb: chat noma'lum — foydalanuvchi t.me/<bot>?start=v_<nonce> ni bosadi, bot kodni yuboradi.
 */
class TelegramVerification
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public function __construct(private StaffBot $bot)
    {
    }

    /** Kod yoqilgan bo'lsa (TELEGRAM_LOGIN_CODE) va bot sozlangan bo'lsa. */
    public function enabled(): bool
    {
        return (bool) config('services.telegram.login_code') && $this->bot->configured();
    }

    /** Super admin'dan tashqari — Telegram'i bog'lanmagan har kim. */
    public function required(User $user): bool
    {
        return $this->enabled() && ! $user->isSuperAdmin() && $user->telegram_id === null;
    }

    /**
     * @param  Collection<int, User>  $users
     * @return array{nonce: string, bot_url: string|null, code_sent: bool}
     */
    public function start(Collection $users, string|int|null $chatId = null): array
    {
        $nonce = Str::random(32);
        Cache::put($this->key($nonce), [
            'user_ids' => $users->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
            'chat_id' => null,
            'code' => null,
            'attempts' => 0,
        ], now()->addMinutes(self::TTL_MINUTES));

        $sent = $chatId !== null && $this->sendCode($nonce, (string) $chatId);
        $username = $this->bot->username();

        return [
            'nonce' => $nonce,
            'bot_url' => $username ? "https://t.me/{$username}?start=v_{$nonce}" : null,
            'code_sent' => $sent,
        ];
    }

    /** Bot chatiga yangi kod yuborish (bot /start v_<nonce> yoki Mini App chaqiradi). */
    public function sendCode(string $nonce, string $chatId): bool
    {
        $state = Cache::get($this->key($nonce));
        if (! is_array($state)) {
            return false;
        }

        $code = (string) random_int(100000, 999999);
        $state['chat_id'] = $chatId;
        $state['code'] = Hash::make($code);
        $state['attempts'] = 0;
        Cache::put($this->key($nonce), $state, now()->addMinutes(self::TTL_MINUTES));

        return $this->bot->sendNow($chatId,
            "🔐 Kirish kodi: <code>{$code}</code>\n\nKodni kitchens.uz kirish oynasiga yozing. "
            .'U '.self::TTL_MINUTES." daqiqa amal qiladi.\nSiz so'ramagan bo'lsangiz, hech kimga bermang.");
    }

    public function exists(string $nonce): bool
    {
        return is_array(Cache::get($this->key($nonce)));
    }

    /**
     * Kod to'g'ri bo'lsa — akkauntlarni Telegram'ga bog'laydi va ularni qaytaradi.
     *
     * @return array{ok: bool, error?: string, users?: Collection<int, User>}
     */
    public function verify(string $nonce, string $code): array
    {
        $state = Cache::get($this->key($nonce));
        if (! is_array($state)) {
            return ['ok' => false, 'error' => 'EXPIRED'];
        }
        if ($state['code'] === null || $state['chat_id'] === null) {
            return ['ok' => false, 'error' => 'NOT_SENT'];
        }

        if (! Hash::check(trim($code), $state['code'])) {
            $state['attempts']++;
            if ($state['attempts'] >= self::MAX_ATTEMPTS) {
                Cache::forget($this->key($nonce));

                return ['ok' => false, 'error' => 'EXPIRED'];
            }
            Cache::put($this->key($nonce), $state, now()->addMinutes(self::TTL_MINUTES));

            return ['ok' => false, 'error' => 'WRONG_CODE'];
        }

        Cache::forget($this->key($nonce));

        $users = User::with('company')->whereIn('id', $state['user_ids'])->get();
        foreach ($users as $user) {
            $user->forceFill(['telegram_id' => $state['chat_id'], 'telegram_linked_at' => now()])->save();
        }

        return ['ok' => true, 'users' => $users];
    }

    private function key(string $nonce): string
    {
        return 'tg-verify:'.$nonce;
    }
}
