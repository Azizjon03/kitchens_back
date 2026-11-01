<?php

namespace App\Services\Telegram;

use App\Jobs\SendStaffTelegramMessage;
use App\Models\StaffBotSetting;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * #37: platformaning bitta xodimlar boti. Token super admin panelidan kiritiladi
 * (staff_bot_settings, shifrlangan); bo'lmasa .env (TELEGRAM_STAFF_BOT_TOKEN).
 * Restoran hech narsa sozlamaydi — xodim botni ochib, panel paroli bilan kiradi.
 */
class StaffBot
{
    private ?StaffBotSetting $setting = null;

    public function __construct(private TelegramClient $client)
    {
    }

    public function setting(): StaffBotSetting
    {
        return $this->setting ??= StaffBotSetting::current();
    }

    public function forget(): void
    {
        $this->setting = null;
    }

    public function token(): ?string
    {
        $token = $this->setting()->token ?: config('services.telegram.staff_token');

        return is_string($token) && $token !== '' ? $token : null;
    }

    /** Token qayerdan: 'panel' | 'env' | null */
    public function source(): ?string
    {
        if ($this->setting()->token) {
            return 'panel';
        }

        return config('services.telegram.staff_token') ? 'env' : null;
    }

    public function configured(): bool
    {
        return $this->token() !== null;
    }

    public function username(): ?string
    {
        $u = ltrim((string) ($this->setting()->username ?: config('services.telegram.staff_username')), '@');

        return $u !== '' ? $u : null;
    }

    /** Birinchi kirishda tasdiqlash kodi: panelda saqlangan bo'lsa — o'sha, aks holda .env. */
    public function loginCodeEnabled(): bool
    {
        $s = $this->setting();

        return $s->exists ? (bool) $s->login_code : (bool) config('services.telegram.login_code');
    }

    /** Webhook sirli kaliti tokendan hosil qilinadi — alohida qiymat kerak emas. */
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

    public function call(string $method, array $params = [], ?string $token = null): array
    {
        $token ??= $this->token();

        return $token ? (array) $this->client->call($token, $method, $params)->json() : ['ok' => false];
    }

    /**
     * Webhook, buyruqlar, menyu tugmasi va tavsifni o'rnatadi.
     *
     * @return array<string, array{ok: bool, error: string|null}>
     */
    public function setup(): array
    {
        $steps = [
            'setWebhook' => [
                'url' => $this->webhookUrl(),
                'secret_token' => $this->webhookSecret(),
                'allowed_updates' => ['message', 'callback_query'],
            ],
            'setMyCommands' => ['commands' => [
                ['command' => 'start', 'description' => 'Boshlash'],
                ['command' => 'hisobot', 'description' => 'Bugungi hisobot (rahbar, menejer)'],
            ]],
            'setChatMenuButton' => ['menu_button' => [
                'type' => 'web_app', 'text' => 'Ochish', 'web_app' => ['url' => $this->miniAppUrl()],
            ]],
            'setMyDescription' => ['description' => "Kitchens restoran xodimlari uchun: buyurtmalar, oshxona, hisobotlar.\n\nKirish uchun «Boshlash» ni bosing."],
        ];

        $results = [];
        foreach ($steps as $method => $params) {
            $res = $this->call($method, $params);
            $results[$method] = ['ok' => (bool) ($res['ok'] ?? false), 'error' => $res['description'] ?? null];
            if ($method === 'setWebhook' && ! $results[$method]['ok']) {
                break;
            }
        }

        $ok = $results['setWebhook']['ok'] ?? false;
        $this->saveStatus($ok, $ok ? null : ($results['setWebhook']['error'] ?? 'Webhook o\'rnatilmadi'));

        return $results;
    }

    /**
     * Holatni tekshiradi; webhook yo'qolgan yoki boshqa manzilda bo'lsa — qayta o'rnatadi.
     */
    public function check(): bool
    {
        if (! $this->configured()) {
            return false;
        }

        $info = $this->call('getWebhookInfo');
        if (! ($info['ok'] ?? false)) {
            $this->saveStatus(false, $info['description'] ?? 'Telegram javob bermadi');

            return false;
        }

        if (($info['result']['url'] ?? '') !== $this->webhookUrl()) {
            return $this->setup()['setWebhook']['ok'] ?? false;
        }

        $this->saveStatus(true, null, (int) ($info['result']['pending_update_count'] ?? 0));

        return true;
    }

    private function saveStatus(bool $ok, ?string $error, int $pending = 0): void
    {
        $s = $this->setting();
        if (! $s->exists && ! $s->token) {
            return; // .env rejimi va panelda yozuv yo'q — saqlash shart emas
        }
        $s->forceFill([
            'status' => $ok ? 'connected' : 'disconnected',
            'last_error' => $error,
            'last_checked_at' => now(),
            'pending_updates' => $pending,
        ])->save();
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
