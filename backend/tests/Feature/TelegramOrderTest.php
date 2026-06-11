<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\MenuItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramOrderTest extends TestCase
{
    use RefreshDatabase;

    private const BOT_TOKEN = '123456:test-bot-token';

    private function makeInitData(int $telegramId, string $firstName = 'Ali'): string
    {
        $params = [
            'auth_date' => (string) time(),
            'query_id' => 'AAH',
            'user' => json_encode(['id' => $telegramId, 'first_name' => $firstName]),
        ];

        ksort($params);
        $pairs = [];
        foreach ($params as $k => $v) {
            $pairs[] = "{$k}={$v}";
        }
        $dataCheckString = implode("\n", $pairs);

        $secret = hash_hmac('sha256', self::BOT_TOKEN, 'WebAppData', true);
        $hash = hash_hmac('sha256', $dataCheckString, $secret);

        return http_build_query(array_merge($params, ['hash' => $hash]));
    }

    private function seedCompany(): array
    {
        $company = Company::create([
            'name' => 'Oq Saroy',
            'slug' => 'oq-saroy',
            'phone' => '+998901112233',
            'is_active' => true,
            'settings_json' => ['telegram_bot_token' => self::BOT_TOKEN, 'service_charge_pct' => 10],
        ]);

        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Markaziy', 'is_active' => true]);

        $category = Category::create([
            'company_id' => $company->id, 'name_uz' => 'Taomlar', 'sort_order' => 1, 'is_active' => true,
        ]);

        $item = MenuItem::create([
            'company_id' => $company->id, 'category_id' => $category->id,
            'name_uz' => 'Osh', 'sell_type' => 'portion', 'price' => 35000,
            'is_available' => true,
        ]);

        return [$company, $branch, $item];
    }

    public function test_customer_can_place_order_via_telegram(): void
    {
        [$company, $branch, $item] = $this->seedCompany();

        $response = $this->withHeaders([
            'X-Telegram-Init-Data' => $this->makeInitData(555000),
        ])->postJson('/api/v1/tg/orders?company=oq-saroy', [
            'branch_id' => $branch->id,
            'items' => [
                ['menu_item_id' => $item->id, 'quantity' => 2],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.type', 'takeaway');
        $response->assertJsonPath('data.status', 'preparing');

        $customer = Customer::where('telegram_id', '555000')->first();
        $this->assertNotNull($customer);

        $this->assertDatabaseHas('orders', [
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'subtotal' => 70000,
        ]);
    }

    public function test_invalid_init_data_is_rejected(): void
    {
        $this->seedCompany();

        $response = $this->withHeaders([
            'X-Telegram-Init-Data' => 'auth_date=1&user=%7B%22id%22%3A1%7D&hash=deadbeef',
        ])->postJson('/api/v1/tg/orders?company=oq-saroy', [
            'items' => [['menu_item_id' => 1, 'quantity' => 1]],
        ]);

        $response->assertStatus(401);
    }

    public function test_menu_endpoint_returns_available_items(): void
    {
        $this->seedCompany();

        $response = $this->withHeaders([
            'X-Telegram-Init-Data' => $this->makeInitData(777000),
        ])->getJson('/api/v1/tg/menu?company=oq-saroy');

        $response->assertOk();
        $response->assertJsonPath('data.company.slug', 'oq-saroy');
        $response->assertJsonPath('data.menu.0.menu_items.0.name_uz', 'Osh');
    }
}
