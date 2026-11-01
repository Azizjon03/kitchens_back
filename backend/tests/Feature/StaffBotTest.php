<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #37: xodimlar boti — birinchi kirishda Telegram kodi (veb va Mini App),
 * Mini App'da parolsiz kirish, oshpazga «Tayyor» tugmasi, ofitsiantga xabar, hisobot.
 */
class StaffBotTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '777000:staff-bot-token';

    private string $webhookUrl = '';

    private Company $company;
    private Branch $branch;
    private User $admin;
    private User $chef;
    private User $waiter;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.telegram.staff_token' => self::TOKEN,
            'services.telegram.staff_username' => 'kitchens_xodim_bot',
            'services.telegram.login_code' => true,
            'services.telegram.frontend_url' => 'https://kitchens.uz',
            'services.telegram.webhook_base' => 'https://kitchens.uz',
        ]);
        Http::fake(function (HttpRequest $req) {
            $path = parse_url($req->url(), PHP_URL_PATH);
            $method = basename($path);
            if ($method === 'getMe') {
                return str_contains($path, 'bad')
                    ? Http::response(['ok' => false, 'description' => 'Unauthorized'], 401)
                    : Http::response(['ok' => true, 'result' => ['id' => 777, 'is_bot' => true, 'username' => 'kitchens_xodim_bot']]);
            }
            if ($method === 'getWebhookInfo') {
                return Http::response(['ok' => true, 'result' => ['url' => $this->webhookUrl, 'pending_update_count' => 2]]);
            }

            return Http::response(['ok' => true, 'result' => ['message_id' => 1]]);
        });

        $this->company = Company::create(['name' => 'Oliyaviy', 'slug' => 'oliyaviy', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $this->admin = $this->user('company_admin', '+998900000001');
        $this->chef = $this->user('chef', '+998900000002');
        $this->waiter = $this->user('waiter', '+998900000003');
    }

    private function user(string $role, string $phone): User
    {
        return User::create([
            'company_id' => $this->company->id, 'branch_id' => $role === 'company_admin' ? null : $this->branch->id,
            'name' => ucfirst($role), 'phone' => $phone, 'role' => $role, 'password' => 'secret123', 'is_active' => true,
        ]);
    }

    private function initData(int $telegramId, string $token = self::TOKEN): string
    {
        $params = ['auth_date' => (string) time(), 'query_id' => 'AAH', 'user' => json_encode(['id' => $telegramId, 'first_name' => 'Vali'])];
        ksort($params);
        $check = implode("\n", array_map(fn ($k, $v) => "{$k}={$v}", array_keys($params), $params));
        $hash = hash_hmac('sha256', $check, hash_hmac('sha256', $token, 'WebAppData', true));

        return http_build_query($params + ['hash' => $hash]);
    }

    /** @return array<int, array<string, mixed>> */
    private function sent(string $method): array
    {
        return collect(Http::recorded())
            ->filter(fn ($pair) => str_ends_with(parse_url($pair[0]->url(), PHP_URL_PATH), '/'.$method))
            ->map(fn ($pair) => $pair[0]->data())->values()->all();
    }

    /** Oxirgi yuborilgan kirish kodi. */
    private function lastCode(): string
    {
        $msg = collect($this->sent('sendMessage'))->last(fn ($m) => str_contains($m['text'], 'Kirish kodi'));
        preg_match('/<code>(\d{6})<\/code>/', $msg['text'], $m);

        return $m[1];
    }

    private function webhook(array $update): void
    {
        static $id = 5000;
        $this->withHeaders(['X-Telegram-Bot-Api-Secret-Token' => substr(hash_hmac('sha256', 'staff-webhook', self::TOKEN), 0, 48)])
            ->postJson('/api/v1/telegram/staff-webhook', ['update_id' => ++$id] + $update)->assertOk();
    }

    private function link(User $user, int $telegramId): void
    {
        $user->forceFill(['telegram_id' => (string) $telegramId, 'telegram_linked_at' => now()])->save();
    }

    public function test_web_first_login_requires_telegram_code_then_logs_in_directly(): void
    {
        $res = $this->postJson('/api/v1/auth/login', ['phone' => '+998900000003', 'password' => 'secret123'])->assertOk();
        $res->assertJsonPath('data.requires_telegram_verification', true)->assertJsonMissingPath('data.token');
        $nonce = $res->json('data.nonce');
        $this->assertSame("https://t.me/kitchens_xodim_bot?start=v_{$nonce}", $res->json('data.bot_url'));

        // Botni ochmasdan kod kiritib bo'lmaydi
        $this->postJson('/api/v1/auth/telegram/verify', ['nonce' => $nonce, 'code' => '123456'])->assertStatus(422)->assertJsonPath('error.code', 'CODE_NOT_SENT');

        // Bot havolasi → shu chatga kod
        $this->webhook(['message' => ['message_id' => 1, 'chat' => ['id' => 4242, 'type' => 'private'], 'from' => ['id' => 4242], 'text' => "/start v_{$nonce}"]]);
        $code = $this->lastCode();
        $this->assertSame(4242, (int) collect($this->sent('sendMessage'))->last()['chat_id']);

        $this->postJson('/api/v1/auth/telegram/verify', ['nonce' => $nonce, 'code' => '000000'])->assertStatus(422)->assertJsonPath('error.code', 'WRONG_CODE');
        $this->postJson('/api/v1/auth/telegram/verify', ['nonce' => $nonce, 'code' => $code])->assertOk()->assertJsonStructure(['data' => ['token', 'user']]);

        $this->assertSame('4242', $this->waiter->fresh()->telegram_id);
        // Kod bir martalik
        $this->postJson('/api/v1/auth/telegram/verify', ['nonce' => $nonce, 'code' => $code])->assertStatus(422);

        // Keyingi kirish — kodsiz
        $this->postJson('/api/v1/auth/login', ['phone' => '+998900000003', 'password' => 'secret123'])->assertOk()->assertJsonStructure(['data' => ['token']]);
    }

    public function test_code_burns_after_five_wrong_attempts(): void
    {
        $nonce = $this->postJson('/api/v1/auth/login', ['phone' => '+998900000003', 'password' => 'secret123'])->json('data.nonce');
        $this->webhook(['message' => ['message_id' => 1, 'chat' => ['id' => 4242, 'type' => 'private'], 'from' => ['id' => 4242], 'text' => "/start v_{$nonce}"]]);
        $code = $this->lastCode();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/telegram/verify', ['nonce' => $nonce, 'code' => '000000'])->assertStatus(422);
        }
        $this->postJson('/api/v1/auth/telegram/verify', ['nonce' => $nonce, 'code' => $code])->assertStatus(422)->assertJsonPath('error.code', 'VERIFICATION_EXPIRED');
        $this->assertNull($this->waiter->fresh()->telegram_id);
    }

    public function test_without_staff_bot_login_is_unchanged_and_super_admin_is_exempt(): void
    {
        User::create(['company_id' => null, 'name' => 'Super', 'phone' => '+998909999999', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true]);
        $this->postJson('/api/v1/auth/login', ['phone' => '+998909999999', 'password' => 'secret123'])->assertOk()->assertJsonStructure(['data' => ['token']]);

        config(['services.telegram.staff_token' => null]);
        $this->postJson('/api/v1/auth/login', ['phone' => '+998900000003', 'password' => 'secret123'])->assertOk()->assertJsonStructure(['data' => ['token']]);
    }

    public function test_login_code_off_by_default_links_mini_app_with_password_only(): void
    {
        config(['services.telegram.login_code' => false]);

        // Vebda kirish o'zgarmaydi
        $this->postJson('/api/v1/auth/login', ['phone' => '+998900000003', 'password' => 'secret123'])->assertOk()->assertJsonStructure(['data' => ['token']]);

        $init = $this->initData(9100);
        $this->postJson('/api/v1/auth/telegram/staff/link', ['init_data' => $init, 'phone' => '+998900000002', 'password' => 'secret123'])
            ->assertOk()->assertJsonPath('data.user.role', 'chef')->assertJsonStructure(['data' => ['token']]);
        $this->assertSame('9100', $this->chef->fresh()->telegram_id);
        $this->assertEmpty(collect($this->sent('sendMessage'))->filter(fn ($m) => str_contains($m['text'], 'Kirish kodi')));

        $this->postJson('/api/v1/auth/telegram/staff', ['init_data' => $init])->assertOk()->assertJsonPath('data.user.id', $this->chef->id);
    }

    public function test_mini_app_links_with_password_and_code_then_auto_logs_in(): void
    {
        $init = $this->initData(9001);

        $this->postJson('/api/v1/auth/telegram/staff', ['init_data' => $init])->assertStatus(404)->assertJsonPath('error.code', 'TELEGRAM_NOT_LINKED');
        $this->postJson('/api/v1/auth/telegram/staff', ['init_data' => $this->initData(9001, '1:other-bot')])->assertStatus(401);
        $this->postJson('/api/v1/auth/telegram/staff/link', ['init_data' => $init, 'phone' => '+998900000002', 'password' => 'wrong'])->assertStatus(401);

        $res = $this->postJson('/api/v1/auth/telegram/staff/link', ['init_data' => $init, 'phone' => '+998 90 000 00 02', 'password' => 'secret123'])
            ->assertOk()->assertJsonPath('data.code_sent', true);
        $this->assertSame(9001, (int) collect($this->sent('sendMessage'))->last()['chat_id']);

        $this->postJson('/api/v1/auth/telegram/verify', ['nonce' => $res->json('data.nonce'), 'code' => $this->lastCode()])
            ->assertOk()->assertJsonPath('data.user.role', 'chef');

        $this->postJson('/api/v1/auth/telegram/staff', ['init_data' => $init])->assertOk()->assertJsonPath('data.user.id', $this->chef->id);

        // Faolsizlantirilgan xodim kira olmaydi
        $this->chef->update(['is_active' => false]);
        $this->postJson('/api/v1/auth/telegram/staff', ['init_data' => $init])->assertStatus(404);
    }

    public function test_admin_unlinks_staff_and_telegram_id_is_never_exposed(): void
    {
        $this->link($this->waiter, 9002);
        Sanctum::actingAs($this->admin);

        $list = $this->getJson('/api/v1/users')->assertOk()->json('data.data');
        $row = collect($list)->firstWhere('id', $this->waiter->id);
        $this->assertTrue($row['telegram_linked']);
        $this->assertArrayNotHasKey('telegram_id', $row);

        $this->deleteJson("/api/v1/users/{$this->waiter->id}/telegram")->assertOk()->assertJsonPath('data.telegram_linked', false);
        $this->assertNull($this->waiter->fresh()->telegram_id);

        $this->getJson('/api/v1/auth/telegram')->assertOk()->assertJsonPath('data.bot_url', 'https://t.me/kitchens_xodim_bot');
    }

    private function order(): Order
    {
        $cat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Taomlar', 'is_active' => true]);
        $item = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => 'Osh', 'price' => 45000, 'is_available' => true]);
        $table = Table::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'number' => '5', 'seats' => 4, 'status' => 'free']);

        Sanctum::actingAs($this->waiter);
        $id = $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'branch_id' => $this->branch->id, 'table_id' => $table->id, 'items' => [['menu_item_id' => $item->id, 'quantity' => 2]]])
            ->assertCreated()->json('data.id');

        return Order::withoutGlobalScopes()->findOrFail($id);
    }

    public function test_chef_gets_order_with_ready_button_and_waiter_is_told_when_ready(): void
    {
        $this->link($this->chef, 7001);
        $this->link($this->waiter, 7002);
        $order = $this->order();

        $toChef = collect($this->sent('sendMessage'))->firstWhere('chat_id', '7001');
        $this->assertNotNull($toChef);
        $this->assertStringContainsString('Stol 5', $toChef['text']);
        $this->assertStringContainsString('Osh — 2 ta', $toChef['text']);
        $this->assertSame("ready:{$order->id}", $toChef['reply_markup']['inline_keyboard'][0][0]['callback_data']);

        // Begona odam tugmani bossa — o'zgarmaydi
        $this->webhook(['callback_query' => ['id' => 'cb0', 'from' => ['id' => 6666], 'data' => "ready:{$order->id}"]]);
        $this->assertSame('preparing', $order->fresh()->status);

        $this->webhook(['callback_query' => ['id' => 'cb1', 'from' => ['id' => 7001], 'data' => "ready:{$order->id}",
            'message' => ['message_id' => 9, 'chat' => ['id' => 7001], 'text' => $toChef['text']]]]);
        $this->assertSame('ready', $order->fresh()->status);

        $toWaiter = collect($this->sent('sendMessage'))->firstWhere('chat_id', '7002');
        $this->assertStringContainsString("#{$order->id} tayyor", $toWaiter['text']);
        $this->assertNotEmpty($this->sent('editMessageText'));

        // Ikkinchi bosish — holat o'zgarmaydi, ofitsiantga takror xabar yo'q
        $this->webhook(['callback_query' => ['id' => 'cb2', 'from' => ['id' => 7001], 'data' => "ready:{$order->id}"]]);
        $this->assertCount(1, collect($this->sent('sendMessage'))->where('chat_id', '7002'));
    }

    public function test_daily_report_and_hisobot_go_to_linked_bosses_only(): void
    {
        $this->link($this->admin, 8001);
        $this->link($this->waiter, 8002);

        Artisan::call('telegram:daily-report');
        $reports = collect($this->sent('sendMessage'))->filter(fn ($m) => str_contains($m['text'], 'hisobot'));
        $this->assertSame(['8001'], $reports->pluck('chat_id')->map(fn ($c) => (string) $c)->unique()->values()->all());

        $this->webhook(['message' => ['message_id' => 1, 'chat' => ['id' => 8002, 'type' => 'private'], 'from' => ['id' => 8002], 'text' => '/hisobot']]);
        $this->assertStringContainsString('faqat rahbar', collect($this->sent('sendMessage'))->last()['text']);

        $this->webhook(['message' => ['message_id' => 1, 'chat' => ['id' => 8001, 'type' => 'private'], 'from' => ['id' => 8001], 'text' => '/hisobot']]);
        $this->assertStringContainsString('Oliyaviy', collect($this->sent('sendMessage'))->last()['text']);
    }

    public function test_start_for_unknown_user_shows_login_button_and_webhook_checks_secret(): void
    {
        $this->webhook(['message' => ['message_id' => 1, 'chat' => ['id' => 3333, 'type' => 'private'], 'from' => ['id' => 3333], 'text' => '/start']]);
        $msg = collect($this->sent('sendMessage'))->last();
        $this->assertSame('https://kitchens.uz/tg/staff', $msg['reply_markup']['inline_keyboard'][0][0]['web_app']['url']);

        $this->withHeaders(['X-Telegram-Bot-Api-Secret-Token' => 'wrong'])
            ->postJson('/api/v1/telegram/staff-webhook', ['update_id' => 1])->assertForbidden();
    }

    public function test_setup_command_registers_webhook_and_menu_button(): void
    {
        $this->assertSame(0, Artisan::call('telegram:staff-setup'));
        $this->assertSame('https://kitchens.uz/api/v1/telegram/staff-webhook', $this->sent('setWebhook')[0]['url']);
        $this->assertSame('https://kitchens.uz/tg/staff', $this->sent('setChatMenuButton')[0]['menu_button']['web_app']['url']);
    }

    private function superAdmin(): User
    {
        return User::create(['company_id' => null, 'name' => 'Super', 'phone' => '+998909999999', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true]);
    }

    public function test_super_admin_sets_token_in_panel_and_it_replaces_env(): void
    {
        config(['services.telegram.staff_token' => null, 'services.telegram.staff_username' => null]);
        Sanctum::actingAs($this->superAdmin());

        $this->getJson('/api/v1/super/staff-bot')->assertOk()->assertJsonPath('data.configured', false)->assertJsonPath('data.status', 'not_configured');

        $this->putJson('/api/v1/super/staff-bot', ['token' => 'abc'])->assertStatus(422);
        $this->putJson('/api/v1/super/staff-bot', ['token' => '123456:bad'.str_repeat('x', 30)])->assertStatus(422)->assertJsonPath('error.code', 'INVALID_TOKEN');

        $token = '123456:'.str_repeat('A', 35);
        $res = $this->putJson('/api/v1/super/staff-bot', ['token' => $token])->assertOk()
            ->assertJsonPath('data.configured', true)->assertJsonPath('data.source', 'panel')
            ->assertJsonPath('data.username', 'kitchens_xodim_bot')->assertJsonPath('data.status', 'connected');
        $this->assertStringNotContainsString($token, $res->getContent());
        $this->assertNotSame($token, \DB::table('staff_bot_settings')->value('token')); // shifrlangan
        $this->assertSame('https://kitchens.uz/api/v1/telegram/staff-webhook', $this->sent('setWebhook')[0]['url']);

        // Webhook panel tokeni bilan imzolangan
        $this->withHeaders(['X-Telegram-Bot-Api-Secret-Token' => substr(hash_hmac('sha256', 'staff-webhook', $token), 0, 48)])
            ->postJson('/api/v1/telegram/staff-webhook', ['update_id' => 1])->assertOk();
    }

    public function test_super_admin_toggles_login_code_checks_and_disconnects(): void
    {
        Sanctum::actingAs($this->superAdmin());
        $this->putJson('/api/v1/super/staff-bot', ['token' => '123456:'.str_repeat('B', 35)])->assertOk();

        $this->patchJson('/api/v1/super/staff-bot/settings', ['login_code' => false])->assertOk()->assertJsonPath('data.login_code', false);
        $this->postJson('/api/v1/auth/login', ['phone' => '+998900000003', 'password' => 'secret123'])->assertJsonStructure(['data' => ['token']]);

        $this->patchJson('/api/v1/super/staff-bot/settings', ['login_code' => true])->assertOk()->assertJsonPath('data.login_code', true);
        $this->postJson('/api/v1/auth/login', ['phone' => '+998900000003', 'password' => 'secret123'])->assertJsonPath('data.requires_telegram_verification', true);

        // Webhook boshqa manzilda — tekshirish qayta o'rnatadi
        $this->webhookUrl = 'https://old.example/hook';
        $before = count($this->sent('setWebhook'));
        $this->postJson('/api/v1/super/staff-bot/check')->assertOk()->assertJsonPath('data.status', 'connected');
        $this->assertSame($before + 1, count($this->sent('setWebhook')));

        $this->link($this->chef, 1);
        $row = collect($this->getJson('/api/v1/super/staff-bot')->json('data.companies'))->firstWhere('id', $this->company->id);
        $this->assertSame(1, $row['staff_linked']);
        $this->assertSame(3, $row['staff_total']);

        config(['services.telegram.staff_token' => null]);
        $this->deleteJson('/api/v1/super/staff-bot')->assertOk()->assertJsonPath('data.configured', false);
        $this->assertNotEmpty($this->sent('deleteWebhook'));
    }

    public function test_only_super_admin_manages_staff_bot(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/v1/super/staff-bot')->assertForbidden();
        $this->putJson('/api/v1/super/staff-bot', ['token' => '123456:'.str_repeat('C', 35)])->assertForbidden();
    }
}
