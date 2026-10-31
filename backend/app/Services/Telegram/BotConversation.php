<?php

namespace App\Services\Telegram;

use App\Models\Customer;
use App\Models\TelegramBot;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * #26: bot chatidagi suhbat.
 * Shaxsiy chat: /start → 📱 telefon (kontakt tugmasi) → F.I.SH → 📍 joylashuv (majburiy)
 * → "🛒 Buyurtma berish" (Mini App). Guruh: "/connect KOD" — yangi buyurtmalar shu guruhga.
 * Rahbar: panel bergan havola (/start admin_KOD) — kunlik hisobot shu chatga.
 */
class BotConversation
{
    public function __construct(private TelegramClient $client)
    {
    }

    /** @param array<string, mixed> $update */
    public function handle(TelegramBot $bot, array $update): void
    {
        $bot->loadMissing('company');

        if (isset($update['my_chat_member'])) {
            $this->onMembership($bot, $update['my_chat_member']);

            return;
        }

        $msg = $update['message'] ?? null;
        if (! $msg || empty($msg['chat']['id'])) {
            return;
        }

        if (($msg['chat']['type'] ?? '') !== 'private') {
            $this->onGroupMessage($bot, $msg);

            return;
        }

        $this->onPrivateMessage($bot, $msg);
    }

    /** @param array<string, mixed> $msg */
    private function onPrivateMessage(TelegramBot $bot, array $msg): void
    {
        $chatId = $msg['chat']['id'];
        $from = $msg['from'] ?? [];
        $text = trim((string) ($msg['text'] ?? ''));

        // Rahbar chatini ulash: t.me/<bot>?start=admin_<KOD>
        if (preg_match('/^\/start\s+admin_([A-Za-z0-9]+)$/', $text, $m)) {
            if (hash_equals(strtoupper($bot->connect_code), strtoupper($m[1]))) {
                $bot->forceFill(['owner_chat_id' => (string) $chatId])->save();
                $this->send($bot, $chatId, "✅ Ulandi. Kunlik hisobot va bot haqidagi ogohlantirishlar shu chatga keladi.");
            } else {
                $this->send($bot, $chatId, "Kod noto'g'ri. Paneldagi havolani qaytadan bosing.");
            }

            return;
        }

        $customer = Customer::firstOrCreate(
            ['telegram_id' => (string) ($from['id'] ?? $chatId)],
            ['name' => trim(($from['first_name'] ?? '').' '.($from['last_name'] ?? '')) ?: null],
        );
        DB::table('customer_companies')->updateOrInsert(
            ['customer_id' => $customer->id, 'company_id' => $bot->company_id],
            ['updated_at' => now(), 'created_at' => now()],
        );
        $stepKey = "tg:step:{$bot->id}:{$chatId}";

        if (isset($msg['contact'])) {
            if ((string) ($msg['contact']['user_id'] ?? '') !== (string) ($from['id'] ?? '')) {
                $this->send($bot, $chatId, "Iltimos, <b>o'zingizning</b> raqamingizni pastdagi tugma orqali yuboring.", $this->contactKeyboard());

                return;
            }
            $phone = preg_replace('/\D+/', '', (string) $msg['contact']['phone_number']);
            $customer->update(['phone' => '+'.$phone]);
            Cache::put($stepKey, 'name', now()->addDay());
            $this->askName($bot, $chatId);

            return;
        }

        if (isset($msg['location'])) {
            if (! $customer->phone) {
                $this->askContact($bot, $chatId);

                return;
            }
            if (Cache::get($stepKey) === 'name') {
                $this->askName($bot, $chatId);

                return;
            }
            $customer->update([
                'latitude' => $msg['location']['latitude'],
                'longitude' => $msg['location']['longitude'],
                'registered_at' => $customer->registered_at ?? now(),
            ]);
            Cache::forget($stepKey);
            $this->send($bot, $chatId, "✅ Rahmat! Joylashuvingiz saqlandi — buyurtmani shu manzilga yetkazamiz (Mini App'da o'zgartirish mumkin).", ['reply_markup' => ['remove_keyboard' => true]]);
            $this->sendOrderButton($bot, $chatId);

            return;
        }

        if ($text !== '' && ! str_starts_with($text, '/') && Cache::get($stepKey) === 'name') {
            $len = mb_strlen($text);
            if ($len < 3 || $len > 100) {
                $this->send($bot, $chatId, "Ism-familiyani to'liq yozing (masalan: <i>Aliyev Vali</i>).");

                return;
            }
            $customer->update(['name' => $text]);
            Cache::put($stepKey, 'location', now()->addDay());
            $this->askLocation($bot, $chatId);

            return;
        }

        // /start, /menu yoki boshqa matn — keyingi kerakli qadam
        $this->nextStep($bot, $chatId, $customer, $text === '/start' || str_starts_with($text, '/start '));
    }

    private function nextStep(TelegramBot $bot, int|string $chatId, Customer $customer, bool $greet): void
    {
        if ($greet && ! $customer->isRegistered()) {
            $this->send($bot, $chatId, "Assalomu alaykum! <b>".e($bot->company->name)."</b> botiga xush kelibsiz.\nBuyurtma berish uchun 3 ta qisqa qadam: raqam, ism va manzil.");
        }

        $step = Cache::get("tg:step:{$bot->id}:{$chatId}");
        if (! $customer->phone) {
            $this->askContact($bot, $chatId);
        } elseif ($step === 'name' || (! $customer->isRegistered() && $step === null)) {
            Cache::put("tg:step:{$bot->id}:{$chatId}", 'name', now()->addDay());
            $this->askName($bot, $chatId);
        } elseif (! $customer->isRegistered() || $customer->latitude === null) {
            $this->askLocation($bot, $chatId);
        } else {
            $this->sendOrderButton($bot, $chatId);
        }
    }

    private function askContact(TelegramBot $bot, int|string $chatId): void
    {
        $this->send($bot, $chatId, "1/3. 📱 Telefon raqamingizni yuboring — pastdagi tugmani bosing.", $this->contactKeyboard());
    }

    private function askName(TelegramBot $bot, int|string $chatId): void
    {
        $this->send($bot, $chatId, "2/3. ✍️ Ism-familiyangizni yozing (masalan: <i>Aliyev Vali</i>).", ['reply_markup' => ['remove_keyboard' => true]]);
    }

    private function askLocation(TelegramBot $bot, int|string $chatId): void
    {
        $this->send($bot, $chatId,
            "3/3. 📍 Joylashuvingizni yuboring — kuryer aynan shu manzilga keladi.\n\n"
            ."Tugma ishlamasa: telefon sozlamalarida <b>Joylashuv (GPS)</b> ni yoqing va Telegram'ga ruxsat bering, so'ng tugmani qayta bosing.",
            ['reply_markup' => [
                'keyboard' => [[['text' => '📍 Joylashuvni yuborish', 'request_location' => true]]],
                'resize_keyboard' => true,
            ]]);
    }

    private function sendOrderButton(TelegramBot $bot, int|string $chatId): void
    {
        $this->send($bot, $chatId, "Menyudan tanlab buyurtma bering 👇", ['reply_markup' => [
            'inline_keyboard' => [[['text' => '🛒 Buyurtma berish', 'web_app' => ['url' => $bot->miniAppUrl()]]]],
        ]]);
    }

    /** @return array<string, mixed> */
    private function contactKeyboard(): array
    {
        return ['reply_markup' => [
            'keyboard' => [[['text' => '📱 Raqamni yuborish', 'request_contact' => true]]],
            'resize_keyboard' => true,
            'one_time_keyboard' => true,
        ]];
    }

    /** @param array<string, mixed> $msg */
    private function onGroupMessage(TelegramBot $bot, array $msg): void
    {
        $text = trim((string) ($msg['text'] ?? ''));
        if (! preg_match('/^\/connect(?:@\w+)?\s+([A-Za-z0-9]+)$/', $text, $m)) {
            return;
        }
        $chatId = $msg['chat']['id'];
        if (! hash_equals(strtoupper($bot->connect_code), strtoupper($m[1]))) {
            $this->send($bot, $chatId, "Kod noto'g'ri. Paneldagi kodni tekshiring.");

            return;
        }
        $bot->forceFill(['group_chat_id' => (string) $chatId, 'group_title' => $msg['chat']['title'] ?? null])->save();
        $this->send($bot, $chatId, "✅ Guruh ulandi. Yangi Telegram buyurtmalari shu yerga keladi.");
    }

    /** @param array<string, mixed> $member */
    private function onMembership(TelegramBot $bot, array $member): void
    {
        $status = $member['new_chat_member']['status'] ?? null;
        $chatId = (string) ($member['chat']['id'] ?? '');
        if (in_array($status, ['left', 'kicked'], true) && $chatId === $bot->group_chat_id) {
            $bot->forceFill(['group_chat_id' => null, 'group_title' => null])->save();
        }
    }

    /** @param array<string, mixed> $extra */
    private function send(TelegramBot $bot, int|string $chatId, string $text, array $extra = []): void
    {
        $this->client->sendMessage($bot->token, $chatId, $text, $extra);
    }
}
