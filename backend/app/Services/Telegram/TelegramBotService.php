<?php

namespace App\Services\Telegram;

use App\Models\Company;
use App\Models\TelegramBot;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * #26: botni ulash, sozlash (webhook + menyu tugmasi + buyruqlar), holatni
 * tekshirish va uzilganda avtomatik tiklash.
 */
class TelegramBotService
{
    public function __construct(private TelegramClient $client)
    {
    }

    /** Token tekshiriladi (getMe) va bot to'liq sozlanadi. */
    public function connect(Company $company, string $token): TelegramBot
    {
        $token = trim($token);
        $hash = hash('sha256', $token);

        $taken = TelegramBot::where('token_hash', $hash)->where('company_id', '!=', $company->id)->exists();
        if ($taken) {
            throw ValidationException::withMessages(['token' => "Bu bot boshqa restoranga ulangan. BotFather'da yangi bot oching."]);
        }

        $me = $this->client->getMe($token);
        if (! $me->json('ok')) {
            throw ValidationException::withMessages(['token' => $me->status() === 401 || $me->status() === 404
                ? "Token noto'g'ri. BotFather bergan tokenni to'liq nusxalang (masalan 123456789:AA...)."
                : "Telegram javob bermadi. Birozdan so'ng qayta urinib ko'ring."]);
        }

        $bot = TelegramBot::firstOrNew(['company_id' => $company->id]);
        $tokenChanged = ! $bot->exists || $bot->token_hash !== $hash;
        $bot->fill([
            'token' => $token,
            'token_hash' => $hash,
            'bot_id' => $me->json('result.id'),
            'username' => $me->json('result.username'),
            'name' => $me->json('result.first_name'),
        ]);
        if ($tokenChanged) {
            $bot->webhook_secret = Str::random(48);
            $bot->connect_code = strtoupper(Str::random(6));
            $bot->group_chat_id = null;
            $bot->group_title = null;
            $bot->owner_chat_id = null;
        }
        $bot->save();
        $bot->setRelation('company', $company);

        $this->configure($bot);

        return $bot->fresh();
    }

    /** Webhook, menyu tugmasi (Mini App) va buyruqlar. Xato bo'lsa holat "Uzilgan". */
    public function configure(TelegramBot $bot): bool
    {
        $token = $bot->token;
        $hook = $this->client->setWebhook($token, $bot->webhookUrl(), $bot->webhook_secret);
        if (! $hook->json('ok')) {
            return $this->markDisconnected($bot, $hook->json('description') ?: "Webhook o'rnatilmadi (HTTP {$hook->status()})", $hook->status() === 401);
        }

        $this->client->setChatMenuButton($token, $bot->miniAppUrl(), 'Buyurtma');
        $this->client->setMyCommands($token, [
            ['command' => 'start', 'description' => 'Boshlash / buyurtma berish'],
            ['command' => 'menu', 'description' => 'Menyuni ochish'],
        ]);

        $bot->forceFill([
            'status' => 'connected', 'last_error' => null, 'last_checked_at' => now(), 'alerted_at' => null,
        ])->save();

        return true;
    }

    /**
     * Har 5 daqiqada: webhook yo'q yoki boshqa manzilda bo'lsa qayta o'rnatiladi;
     * token bekor qilingan bo'lsa (401) — "Uzilgan" va ogohlantirish.
     */
    public function check(TelegramBot $bot): bool
    {
        $bot->loadMissing('company');
        $info = $this->client->getWebhookInfo($bot->token);

        if ($info->status() === 401 || $info->status() === 404) {
            return $this->markDisconnected($bot, "Token bekor qilingan (BotFather'da /revoke qilingan bo'lishi mumkin). Yangi token kiriting.", true);
        }
        if (! $info->json('ok')) {
            // Telegram vaqtincha javob bermadi — holatni o'zgartirmaymiz, keyingi tekshiruvda qayta
            $bot->forceFill(['last_checked_at' => now(), 'last_error' => "Telegram javob bermadi (HTTP {$info->status()})"])->save();

            return $bot->isConnected();
        }

        $bot->forceFill(['pending_updates' => (int) $info->json('result.pending_update_count', 0)]);
        if ($info->json('result.url') !== $bot->webhookUrl()) {
            Log::warning('telegram.webhook_reset', ['bot' => $bot->id, 'url' => $info->json('result.url')]);

            return $this->configure($bot);
        }

        $lastErrorAt = (int) $info->json('result.last_error_date', 0);
        $recentError = $lastErrorAt > now()->subMinutes(10)->timestamp ? $info->json('result.last_error_message') : null;
        $bot->forceFill([
            'status' => 'connected',
            'last_checked_at' => now(),
            'last_error' => $recentError,
            'alerted_at' => null,
        ])->save();

        return true;
    }

    public function disconnect(TelegramBot $bot): void
    {
        $this->client->deleteWebhook($bot->token);
        $bot->delete();
    }

    private function markDisconnected(TelegramBot $bot, string $error, bool $tokenRevoked): bool
    {
        $bot->forceFill(['status' => 'disconnected', 'last_error' => $error, 'last_checked_at' => now()])->save();

        // Bir uzilish uchun bitta ogohlantirish (qayta ulanganda alerted_at tozalanadi)
        if ($bot->alerted_at === null) {
            $this->alert($bot, $error, $tokenRevoked);
            $bot->forceFill(['alerted_at' => now()])->save();
        }

        return false;
    }

    /**
     * Ogohlantirish: rahbar chatiga (bot ishlasa) + log. Token bekor bo'lsa bot
     * orqali yozib bo'lmaydi — panel (holat kartasi) va super admin ro'yxati ko'rsatadi.
     */
    private function alert(TelegramBot $bot, string $error, bool $tokenRevoked): void
    {
        Log::error('telegram.bot_disconnected', ['bot' => $bot->id, 'company' => $bot->company_id, 'error' => $error]);

        if (! $tokenRevoked && $bot->owner_chat_id) {
            $this->client->sendMessage($bot->token, $bot->owner_chat_id,
                "⚠️ <b>Bot aloqasi uzildi</b>\n".e($error)."\nPanel → Telegram bot → «Qayta ulash».");
        }
    }
}
