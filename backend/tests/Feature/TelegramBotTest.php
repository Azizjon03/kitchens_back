<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\TelegramBot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #26: restoran boti — panel orqali ulash, mijoz ro'yxatdan o'tishi (telefon,
 * F.I.SH, joylashuv), guruh/rahbar ulash, bildirishnomalar, avtomatik tiklash,
 * Mini App buyurtmasining takrorlanmasligi.
 */
class TelegramBotTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1';

    private Company $company;
    private Branch $branch;
    private User $admin;

    /** @var array<string, mixed> */
    private array $webhookInfo = [];

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'https://kitchens.uz', 'services.telegram.webhook_base' => 'https://kitchens.uz', 'services.telegram.frontend_url' => 'https://kitchens.uz']);
        $this->company = Company::create(['name' => 'Oliyaviy', 'slug' => 'oliyaviy', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $this->admin = User::create(['company_id' => $this->company->id, 'name' => 'Rahbar', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]);
        $this->fakeTelegram();
    }

    private int $getMeStatus = 200;

    private function fakeTelegram(): void
    {
        Http::fake(function (HttpRequest $req) {
            $getMeStatus = $this->getMeStatus;
            $method = basename(parse_url($req->url(), PHP_URL_PATH));

            return match ($method) {
                'getMe' => $getMeStatus === 200
                    ? Http::response(['ok' => true, 'result' => ['id' => 987, 'username' => 'oliyaviy_bot', 'first_name' => 'Oliyaviy']])
                    : Http::response(['ok' => false, 'description' => 'Unauthorized'], $getMeStatus),
                'getWebhookInfo' => isset($this->webhookInfo['status'])
                    ? Http::response(['ok' => false, 'description' => 'Unauthorized'], $this->webhookInfo['status'])
                    : Http::response(['ok' => true, 'result' => $this->webhookInfo + ['url' => '', 'pending_update_count' => 0]]),
                default => Http::response(['ok' => true, 'result' => true]),
            };
        });
    }

    /** @return array<int, array<string, mixed>> */
    private function sent(string $method): array
    {
        return collect(Http::recorded())
            ->filter(fn ($pair) => str_ends_with(parse_url($pair[0]->url(), PHP_URL_PATH), '/'.$method))
            ->map(fn ($pair) => $pair[0]->data())->values()->all();
    }

    private function connect(): TelegramBot
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/v1/telegram-bot', ['token' => self::TOKEN])->assertOk();

        return TelegramBot::firstOrFail();
    }

    private int $updateId = 1000;

    /** @param array<string, mixed> $message */
    private function update(TelegramBot $bot, array $message, ?int $updateId = null): \Illuminate\Testing\TestResponse
    {
        return $this->withHeaders(['X-Telegram-Bot-Api-Secret-Token' => $bot->webhook_secret])
            ->postJson("/api/v1/telegram/webhook/{$bot->id}", ['update_id' => $updateId ?? ++$this->updateId, 'message' => $message]);
    }

    /** @param array<string, mixed> $extra */
    private function privateMsg(array $extra, int $userId = 555): array
    {
        return ['message_id' => 1, 'chat' => ['id' => $userId, 'type' => 'private'], 'from' => ['id' => $userId, 'first_name' => 'Vali']] + $extra;
    }

    public function test_admin_connects_bot_and_token_is_never_returned(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->postJson('/api/v1/telegram-bot', ['token' => self::TOKEN])->assertOk()
            ->assertJsonPath('data.username', 'oliyaviy_bot')
            ->assertJsonPath('data.status', 'connected');
        $this->assertStringNotContainsString(self::TOKEN, $res->getContent());

        $bot = TelegramBot::firstOrFail();
        $this->assertNotSame(self::TOKEN, DB::table('telegram_bots')->value('token'), 'Token shifrlangan saqlanadi');
        $this->assertSame(self::TOKEN, $bot->token);

        $hook = $this->sent('setWebhook')[0];
        $this->assertSame("https://kitchens.uz/api/v1/telegram/webhook/{$bot->id}", $hook['url']);
        $this->assertSame($bot->webhook_secret, $hook['secret_token']);
        $this->assertSame('https://kitchens.uz/tg?company=oliyaviy', $this->sent('setChatMenuButton')[0]['menu_button']['web_app']['url']);

        $this->getJson('/api/v1/telegram-bot')->assertOk()
            ->assertJsonPath('data.owner_link', "https://t.me/oliyaviy_bot?start=admin_{$bot->connect_code}");
    }

    public function test_invalid_or_foreign_token_is_rejected_and_staff_cannot_connect(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/v1/telegram-bot', ['token' => 'salom'])->assertStatus(422)->assertJsonValidationErrors('token');

        $this->getMeStatus = 401;
        $this->postJson('/api/v1/telegram-bot', ['token' => self::TOKEN])->assertStatus(422)->assertJsonValidationErrors('token');
        $this->assertSame(0, TelegramBot::count());

        $this->getMeStatus = 200;
        $other = Company::create(['name' => 'B', 'slug' => 'b', 'phone' => '+998700000009', 'is_active' => true]);
        TelegramBot::create(['company_id' => $other->id, 'token' => self::TOKEN, 'token_hash' => hash('sha256', self::TOKEN), 'webhook_secret' => 'x', 'connect_code' => 'ABC123']);
        $this->postJson('/api/v1/telegram-bot', ['token' => self::TOKEN])->assertStatus(422);

        $waiter = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'O', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($waiter);
        $this->getJson('/api/v1/telegram-bot')->assertForbidden();
    }

    public function test_webhook_rejects_wrong_secret(): void
    {
        $bot = $this->connect();

        $this->withHeaders(['X-Telegram-Bot-Api-Secret-Token' => 'notogri'])
            ->postJson("/api/v1/telegram/webhook/{$bot->id}", ['update_id' => 1, 'message' => $this->privateMsg(['text' => '/start'])])
            ->assertForbidden();
    }

    public function test_customer_registers_with_contact_name_and_location_then_gets_order_button(): void
    {
        $bot = $this->connect();

        $this->update($bot, $this->privateMsg(['text' => '/start']))->assertOk();
        $last = collect($this->sent('sendMessage'))->last();
        $this->assertTrue($last['reply_markup']['keyboard'][0][0]['request_contact']);

        // Birovning kontakti qabul qilinmaydi
        $this->update($bot, $this->privateMsg(['contact' => ['phone_number' => '998901234567', 'user_id' => 777]]));
        $this->assertNull(Customer::where('telegram_id', '555')->value('phone'));

        $this->update($bot, $this->privateMsg(['contact' => ['phone_number' => '998901234567', 'user_id' => 555]]));
        $this->assertSame('+998901234567', Customer::where('telegram_id', '555')->value('phone'));

        // Joylashuv ismdan oldin — avval ism so'raladi
        $this->update($bot, $this->privateMsg(['location' => ['latitude' => 40.99, 'longitude' => 71.24]]));
        $this->assertNull(Customer::where('telegram_id', '555')->value('latitude'));

        $this->update($bot, $this->privateMsg(['text' => 'Aliyev Vali']));
        $this->update($bot, $this->privateMsg(['location' => ['latitude' => 40.9983, 'longitude' => 71.2372]]));

        $customer = Customer::where('telegram_id', '555')->firstOrFail();
        $this->assertSame('Aliyev Vali', $customer->name);
        $this->assertEqualsWithDelta(40.9983, $customer->latitude, 0.0001);
        $this->assertTrue($customer->isRegistered());

        $button = collect($this->sent('sendMessage'))->last()['reply_markup']['inline_keyboard'][0][0];
        $this->assertSame('🛒 Buyurtma berish', $button['text']);
        $this->assertSame('https://kitchens.uz/tg?company=oliyaviy', $button['web_app']['url']);

        // Ro'yxatdan o'tgan mijoz /start bosganda — darhol buyurtma tugmasi
        $this->update($bot, $this->privateMsg(['text' => '/start']));
        $this->assertArrayHasKey('inline_keyboard', collect($this->sent('sendMessage'))->last()['reply_markup']);
    }

    public function test_duplicate_update_is_processed_once(): void
    {
        $bot = $this->connect();
        $before = count($this->sent('sendMessage'));

        $this->update($bot, $this->privateMsg(['text' => '/start']), 42)->assertOk();
        $afterFirst = count($this->sent('sendMessage'));
        $this->update($bot, $this->privateMsg(['text' => '/start']), 42)->assertOk();

        $this->assertGreaterThan($before, $afterFirst);
        $this->assertSame($afterFirst, count($this->sent('sendMessage')));
    }

    public function test_group_and_owner_chat_are_connected_with_code(): void
    {
        $bot = $this->connect();

        $this->update($bot, ['message_id' => 1, 'chat' => ['id' => -100500, 'type' => 'supergroup', 'title' => 'Oshxona'], 'from' => ['id' => 1], 'text' => '/connect NOTOGRI']);
        $this->assertNull($bot->fresh()->group_chat_id);

        $this->update($bot, ['message_id' => 2, 'chat' => ['id' => -100500, 'type' => 'supergroup', 'title' => 'Oshxona'], 'from' => ['id' => 1], 'text' => "/connect@oliyaviy_bot {$bot->connect_code}"]);
        $this->assertSame('-100500', $bot->fresh()->group_chat_id);

        $this->update($bot, $this->privateMsg(['text' => "/start admin_{$bot->connect_code}"], 999));
        $this->assertSame('999', $bot->fresh()->owner_chat_id);
        $this->assertNull(Customer::where('telegram_id', '999')->first(), 'Rahbar mijoz sifatida yozilmaydi');

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/v1/telegram-bot')->assertJsonPath('data.group_connected', true)->assertJsonPath('data.owner_connected', true)->assertJsonPath('data.group_title', 'Oshxona');
    }

    private function menuItem(): MenuItem
    {
        $cat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Taomlar', 'is_active' => true]);

        return MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => 'Osh', 'sell_type' => 'portion', 'price' => 30000, 'is_available' => true]);
    }

    private function tgHeaders(string $devId = '555'): array
    {
        return ['X-Company-Slug' => 'oliyaviy', 'X-Telegram-Dev-Id' => $devId];
    }

    public function test_tg_order_notifies_group_and_customer_and_status_changes_reach_customer(): void
    {
        config(['app.debug' => true]);
        $bot = $this->connect();
        $bot->forceFill(['group_chat_id' => '-100500'])->save();
        $item = $this->menuItem();
        Customer::create(['telegram_id' => '555', 'name' => 'Aliyev Vali', 'phone' => '+998901234567', 'latitude' => 40.99, 'longitude' => 71.23, 'registered_at' => now()]);

        $id = $this->withHeaders($this->tgHeaders())->postJson('/api/v1/tg/orders?company=oliyaviy', [
            'branch_id' => $this->branch->id, 'type' => 'delivery', 'items' => [['menu_item_id' => $item->id, 'quantity' => 2]],
        ])->assertCreated()->json('data.id');

        $order = Order::findOrFail($id);
        $this->assertSame('delivery', $order->type);
        $this->assertEqualsWithDelta(40.99, (float) $order->delivery_lat, 0.001, 'Bot ro\'yxatidagi joylashuv avtomatik');

        $messages = collect($this->sent('sendMessage'));
        $group = $messages->firstWhere('chat_id', '-100500');
        $this->assertStringContainsString("Yangi Telegram buyurtma #{$id}", $group['text']);
        $this->assertStringContainsString('Osh — 2 ta', $group['text']);
        $this->assertStringContainsString('+998901234567', $group['text']);
        $this->assertStringContainsString('maps.google.com/?q=40.99', $group['text']);
        $this->assertStringContainsString('qabul qilindi', $messages->firstWhere('chat_id', '555')['text']);

        $chef = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'Oshpaz', 'phone' => '+998900000003', 'role' => 'chef', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($chef);
        $this->patchJson("/api/v1/orders/{$id}/status", ['status' => 'ready'])->assertOk();
        $this->assertStringContainsString('tayyor', collect($this->sent('sendMessage'))->where('chat_id', '555')->last()['text']);
    }

    public function test_staff_orders_do_not_message_telegram(): void
    {
        $this->connect();
        $item = $this->menuItem();
        $before = count($this->sent('sendMessage'));

        $this->postJson('/api/v1/orders', ['type' => 'takeaway', 'branch_id' => $this->branch->id, 'items' => [['menu_item_id' => $item->id, 'quantity' => 1]]])->assertCreated();

        $this->assertSame($before, count($this->sent('sendMessage')));
    }

    public function test_repeated_submit_with_same_client_key_creates_one_order(): void
    {
        config(['app.debug' => true]);
        $item = $this->menuItem();
        $payload = ['branch_id' => $this->branch->id, 'client_key' => 'k-123', 'items' => [['menu_item_id' => $item->id, 'quantity' => 1]]];

        $first = $this->withHeaders($this->tgHeaders())->postJson('/api/v1/tg/orders?company=oliyaviy', $payload)->assertCreated()->json('data.id');
        $second = $this->withHeaders($this->tgHeaders())->postJson('/api/v1/tg/orders?company=oliyaviy', $payload)->assertOk()->json('data.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, Order::withoutGlobalScopes()->count());
    }

    public function test_delivery_without_any_address_is_rejected_and_me_returns_profile(): void
    {
        config(['app.debug' => true]);
        $item = $this->menuItem();

        $this->withHeaders($this->tgHeaders('777'))->postJson('/api/v1/tg/orders?company=oliyaviy', [
            'branch_id' => $this->branch->id, 'type' => 'delivery', 'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.code', 'ADDRESS_REQUIRED');

        $this->withHeaders($this->tgHeaders('777'))->getJson('/api/v1/tg/me?company=oliyaviy')->assertOk()
            ->assertJsonPath('data.registered', false);
    }

    public function test_health_check_restores_lost_webhook_and_alerts_once_when_token_revoked(): void
    {
        $bot = $this->connect();
        $bot->forceFill(['owner_chat_id' => '999'])->save();

        // Webhook boshqa joyga o'zgartirilgan — qayta o'rnatiladi
        $this->webhookInfo = ['url' => 'https://boshqa.uz/hook'];
        $hooksBefore = count($this->sent('setWebhook'));
        Artisan::call('telegram:health');
        $this->assertSame($hooksBefore + 1, count($this->sent('setWebhook')));
        $this->assertSame('connected', $bot->fresh()->status);

        // Token bekor qilingan — "Uzilgan", ogohlantirish faqat bir marta logga
        $this->webhookInfo = ['status' => 401];
        Artisan::call('telegram:health');
        Artisan::call('telegram:health');
        $fresh = $bot->fresh();
        $this->assertSame('disconnected', $fresh->status);
        $this->assertNotNull($fresh->alerted_at);
        $this->assertStringContainsString('Token bekor', $fresh->last_error);

        $super = User::create(['name' => 'S', 'phone' => '+998906921469', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($super);
        $this->getJson('/api/v1/super/telegram-bots')->assertOk()
            ->assertJsonPath('data.0.status', 'disconnected')
            ->assertJsonPath('data.0.company.name', 'Oliyaviy');
    }

    public function test_daily_report_goes_to_owner_chat(): void
    {
        $bot = $this->connect();
        $bot->forceFill(['owner_chat_id' => '999'])->save();

        Artisan::call('telegram:daily-report');

        $report = collect($this->sent('sendMessage'))->firstWhere('chat_id', '999');
        $this->assertStringContainsString('hisobot', $report['text']);
        $this->assertStringContainsString('Tushum', $report['text']);
    }

    public function test_admin_disconnects_bot(): void
    {
        $this->connect();

        $this->deleteJson('/api/v1/telegram-bot')->assertOk();

        $this->assertSame(0, TelegramBot::count());
        $this->assertCount(1, $this->sent('deleteWebhook'));
        $this->getJson('/api/v1/telegram-bot')->assertOk()->assertJsonPath('data', null);
    }
}
