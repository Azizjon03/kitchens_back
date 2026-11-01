<?php

namespace App\Services\Telegram;

use App\Jobs\SendStaffTelegramMessage;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * #37: platformaning bitta xodimlar boti. Token .env'da (TELEGRAM_STAFF_BOT_TOKEN);
 * restoran hech narsa sozlamaydi — xodim botni ochib, panel paroli bilan kiradi.
 */
class StaffBot
{
    public function __construct(private TelegramClient $client)
    {
    }

    public function token(): ?string
    {
        $token = config('services.telegram.staff_token');

        return is_string($token) && $token !== '' ? $token : null;
    }

    public function configured(): bool
    {
        return $this->token() !== null;
    }

    public function username(): ?string
    {
        $u = ltrim((string) config('services.telegram.staff_username'), '@');

        return $u !== '' ? $u : null;
    }

    /** Webhook sirli kaliti tokendan hosil qilinadi — alohida .env qiymati kerak emas. */
    public function webhookSecret(): string
    {
        return substr(hash_hmac('sha256', 'staff-webhook', (string) $this->token()), 0, 48);
    }

    public function webhookUrl(): string
    {
        return rtrim((string) config('services.telegram.webhook_base', config('app.url')), '/')
            .'/api/v1/telegram/staff-webhook';
    }

    public function miniAppUrl(): string
    {
        return rtrim((string) config('services.telegram.frontend_url'), '/').'/tg/staff';
    }

    /** Darhol yuborish (javobi kerak bo'lganda — masalan, tasdiqlash kodi). */
    public function sendNow(string|int $chatId, string $text, array $extra = []): bool
    {
        $token = $this->token();
        if (! $token) {
            return false;
        }

        return (bool) $this->client->sendMessage($token, $chatId, $text, $extra)->json('ok');
    }

    /** Navbat orqali yuborish (bildirishnomalar). */
    public function queue(string|int $chatId, string $text, array $extra = []): void
    {
        if ($this->configured()) {
            SendStaffTelegramMessage::dispatch((string) $chatId, $text, $extra);
        }
    }

    public function call(string $method, array $params = []): array
    {
        $token = $this->token();

        return $token ? (array) $this->client->call($token, $method, $params)->json() : ['ok' => false];
    }

    /**
     * Restoranning Telegram'i ulangan faol xodimlari.
     *
     * @param  array<int, string>  $roles
     * @return Collection<int, User>
     */
    public function recipients(int $companyId, array $roles, ?int $branchId = null): Collection
    {
        return User::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereIn('role', $roles)
            ->where('is_active', true)
            ->whereNotNull('telegram_id')
            // Filialga bog'lanmagan xodim (rahbar, menejer) barcha filiallarni ko'radi
            ->when($branchId, fn ($q) => $q->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', $branchId)))
            ->get();
    }

    public function webAppButton(string $text = '📱 Ochish'): array
    {
        return ['inline_keyboard' => [[['text' => $text, 'web_app' => ['url' => $this->miniAppUrl()]]]]];
    }
}
