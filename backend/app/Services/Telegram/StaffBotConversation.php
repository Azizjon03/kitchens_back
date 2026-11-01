<?php

namespace App\Services\Telegram;

use App\Events\OrderStatusUpdated;
use App\Models\Order;
use App\Models\User;
use App\Services\Reports\DailyReport;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * #37: xodimlar boti suhbati.
 * - /start — ulangan bo'lsa salom va «Ochish» tugmasi, bo'lmasa kirish yo'riqnomasi.
 * - /start v_<nonce> — veb-paneldan kirish: shu chatga tasdiqlash kodi yuboriladi.
 * - /hisobot — rahbar va menejerga bugungi hisobot.
 * - «✅ Tayyor» tugmasi (callback ready:<id>) — oshpaz buyurtmani tayyor deb belgilaydi.
 */
class StaffBotConversation
{
    private const ROLE_HELP = [
        'company_admin' => "Kunlik hisobot va muhim ogohlantirishlar shu yerga keladi. /hisobot — bugungi hisobot.",
        'manager' => "Kunlik hisobot shu yerga keladi. /hisobot — bugungi hisobot.",
        'waiter' => "Buyurtma tayyor bo'lsa shu yerga xabar keladi. Buyurtma berish uchun «Ochish» ni bosing.",
        'chef' => "Yangi buyurtmalar shu yerga keladi — tayyor bo'lsa «✅ Tayyor» ni bosing.",
        'cashier' => "Kassa va buyurtmalar uchun «Ochish» ni bosing.",
    ];

    public function __construct(
        private StaffBot $bot,
        private TelegramVerification $verification,
        private DailyReport $report,
    ) {
    }

    /** @param array<string, mixed> $update */
    public function handle(array $update): void
    {
        if (isset($update['callback_query'])) {
            $this->onCallback($update['callback_query']);

            return;
        }

        $msg = $update['message'] ?? null;
        if (! $msg || ($msg['chat']['type'] ?? '') !== 'private' || empty($msg['from']['id'])) {
            return;
        }

        $chatId = (string) $msg['chat']['id'];
        $text = trim((string) ($msg['text'] ?? ''));

        if (preg_match('/^\/start\s+v_([A-Za-z0-9]{32})$/', $text, $m)) {
            if (! $this->verification->sendCode($m[1], $chatId)) {
                $this->bot->sendNow($chatId, "Havola eskirgan. kitchens.uz'da qaytadan kiring va yangi havolani bosing.");
            }

            return;
        }

        $users = $this->linkedUsers((string) $msg['from']['id']);

        if (preg_match('/^\/hisobot(?:@\w+)?$/', $text)) {
            $this->sendReports($chatId, $users);

            return;
        }

        if ($users->isEmpty()) {
            $this->bot->sendNow($chatId,
                "Assalomu alaykum! Bu <b>Kitchens</b> xodimlar boti.\n\n"
                ."Kirish uchun pastdagi «Kirish» ni bosing va panel <b>telefon raqami va parolingizni</b> yozing. "
                ."Bir marta kirasiz — keyin bot avtomatik taniydi.\n\n"
                ."Parolni restoran rahbaringiz beradi.",
                ['reply_markup' => $this->bot->webAppButton('🔐 Kirish')]);

            return;
        }

        $lines = ['Assalomu alaykum, <b>'.e($users->first()->name).'</b>!'];
        foreach ($users as $u) {
            $lines[] = '• '.e($u->company?->name ?? 'Kitchens').' — '.e($this->roleName($u->role));
        }
        $lines[] = '';
        $lines[] = self::ROLE_HELP[$users->first()->role] ?? '';
        $this->bot->sendNow($chatId, implode("\n", $lines), ['reply_markup' => $this->bot->webAppButton()]);
    }

    /** @param array<string, mixed> $cb */
    private function onCallback(array $cb): void
    {
        $data = (string) ($cb['data'] ?? '');
        $fromId = (string) ($cb['from']['id'] ?? '');

        if (! preg_match('/^ready:(\d+)$/', $data, $m) || $fromId === '') {
            $this->answer($cb, '');

            return;
        }

        $order = Order::withoutGlobalScopes()->find((int) $m[1]);
        $user = $order ? $this->linkedUsers($fromId)
            ->first(fn (User $u) => $u->company_id === $order->company_id
                && $u->hasRole(['chef', 'manager', 'company_admin'])
                && ($u->branch_id === null || $u->branch_id === $order->branch_id)) : null;

        if (! $order || ! $user) {
            $this->answer($cb, "Bu buyurtmani belgilashga ruxsatingiz yo'q.");

            return;
        }

        $previous = null;
        DB::transaction(function () use ($order, &$previous) {
            $locked = Order::withoutGlobalScopes()->lockForUpdate()->find($order->id);
            $previous = $locked->status;
            if ($locked->status === 'preparing') {
                $locked->update(['status' => 'ready']);
            }
        });

        if ($previous !== 'preparing') {
            $this->answer($cb, "Buyurtma allaqachon «{$previous}» holatida.");
            $this->markMessage($cb, '✅ Tayyor (oldin belgilangan)');

            return;
        }

        $order->refresh()->load(['table', 'user', 'orderItems.menuItem']);
        OrderStatusUpdated::dispatch($order, 'preparing');

        $this->answer($cb, '✅ Tayyor deb belgilandi');
        $this->markMessage($cb, '✅ Tayyor — '.e($user->name));
    }

    /** @param Collection<int, User> $users */
    private function sendReports(string $chatId, Collection $users): void
    {
        $bosses = $users->filter(fn (User $u) => $u->hasRole(['company_admin', 'manager']) && $u->company);
        if ($bosses->isEmpty()) {
            $this->bot->sendNow($chatId, 'Hisobot faqat rahbar va menejerlar uchun.');

            return;
        }
        foreach ($bosses->unique('company_id') as $u) {
            $this->bot->sendNow($chatId, $this->report->text($u->company, now()));
        }
    }

    /** @return Collection<int, User> */
    private function linkedUsers(string $telegramId): Collection
    {
        return User::withoutGlobalScopes()->with('company')
            ->where('telegram_id', $telegramId)->where('is_active', true)->get()
            ->filter(fn (User $u) => $u->company === null || $u->company->is_active)
            ->values();
    }

    private function roleName(string $role): string
    {
        return [
            'company_admin' => 'Rahbar', 'manager' => 'Menejer', 'waiter' => 'Ofitsiant',
            'chef' => 'Oshpaz', 'cashier' => 'Kassir', 'super_admin' => 'Super admin',
        ][$role] ?? $role;
    }

    /** @param array<string, mixed> $cb */
    private function answer(array $cb, string $text): void
    {
        $this->bot->call('answerCallbackQuery', array_filter([
            'callback_query_id' => $cb['id'] ?? null,
            'text' => $text !== '' ? $text : null,
        ]));
    }

    /** Tugmani olib tashlab, xabar ostiga kim belgilaganini yozadi. @param array<string, mixed> $cb */
    private function markMessage(array $cb, string $suffix): void
    {
        $message = $cb['message'] ?? null;
        if (! $message) {
            return;
        }
        $this->bot->call('editMessageText', [
            'chat_id' => $message['chat']['id'],
            'message_id' => $message['message_id'],
            'text' => e((string) ($message['text'] ?? ''))."\n\n<b>{$suffix}</b>",
            'parse_mode' => 'HTML',
        ]);
    }
}
