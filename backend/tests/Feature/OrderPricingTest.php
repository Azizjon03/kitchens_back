<?php

namespace Tests\Feature;

use App\Events\OrderStatusUpdated;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers order line pricing (sell_type / min_weight / weight_step), the
 * payment-before-paid rule and table release on terminal statuses.
 */
class OrderPricingTest extends TestCase
{
    use RefreshDatabase;

    private const BOT_TOKEN = '123456:pricing-bot-token';

    private Company $company;

    private Branch $branch;

    private User $admin;

    private Table $table;

    private MenuItem $portionItem;

    private MenuItem $weightItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create([
            'name' => 'Pricing Co',
            'slug' => 'pricing-co',
            'phone' => '+998900000100',
            'is_active' => true,
            'settings_json' => [
                'service_charge_pct' => 0,
                'max_discount_pct' => 20,
                'telegram_bot_token' => self::BOT_TOKEN,
            ],
        ]);

        $this->branch = Branch::create([
            'company_id' => $this->company->id, 'name' => 'Main', 'is_active' => true,
        ]);

        $this->admin = User::create([
            'company_id' => $this->company->id, 'branch_id' => $this->branch->id,
            'name' => 'Admin', 'phone' => '+998900000101', 'role' => 'company_admin',
            'password' => 'secret123', 'is_active' => true,
        ]);

        $this->table = Table::create([
            'company_id' => $this->company->id, 'branch_id' => $this->branch->id,
            'number' => '1', 'seats' => 4, 'status' => 'free',
        ]);

        $category = Category::create([
            'company_id' => $this->company->id, 'name_uz' => 'Taomlar',
            'sort_order' => 1, 'is_active' => true,
        ]);

        $this->portionItem = MenuItem::create([
            'company_id' => $this->company->id, 'category_id' => $category->id,
            'name_uz' => 'Osh', 'sell_type' => 'portion', 'price' => 50000,
            'is_available' => true,
        ]);

        $this->weightItem = MenuItem::create([
            'company_id' => $this->company->id, 'category_id' => $category->id,
            'name_uz' => 'Kabob (kg)', 'sell_type' => 'weight', 'price' => 80000,
            'min_weight' => 0.3, 'weight_step' => 0.1, 'is_available' => true,
        ]);

        Sanctum::actingAs($this->admin);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function placeOrder(array $items, string $type = 'takeaway', ?int $tableId = null)
    {
        return $this->postJson('/api/v1/orders', array_filter([
            'branch_id' => $this->branch->id,
            'table_id' => $tableId,
            'type' => $type,
            'items' => $items,
        ], fn ($v) => $v !== null));
    }

    // --- sell_type pricing rules -------------------------------------------

    public function test_portion_item_rejects_a_weight(): void
    {
        $response = $this->placeOrder([
            ['menu_item_id' => $this->portionItem->id, 'quantity' => 5, 'weight_kg' => 0.001],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('items.0.weight_kg');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_weight_item_requires_a_weight(): void
    {
        $response = $this->placeOrder([
            ['menu_item_id' => $this->weightItem->id, 'quantity' => 1],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('items.0.weight_kg');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_weight_below_min_weight_is_rejected(): void
    {
        $response = $this->placeOrder([
            ['menu_item_id' => $this->weightItem->id, 'quantity' => 1, 'weight_kg' => 0.2],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('items.0.weight_kg');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_weight_that_is_not_a_multiple_of_the_step_is_rejected(): void
    {
        $response = $this->placeOrder([
            ['menu_item_id' => $this->weightItem->id, 'quantity' => 1, 'weight_kg' => 0.35],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('items.0.weight_kg');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_weight_item_is_priced_by_weight_and_quantity_is_pinned_to_one(): void
    {
        // quantity 5 must not multiply a weighed line.
        $response = $this->placeOrder([
            ['menu_item_id' => $this->weightItem->id, 'quantity' => 5, 'weight_kg' => 0.5],
        ]);

        $response->assertCreated();

        $item = OrderItem::firstOrFail();
        $this->assertSame('0.500', (string) $item->weight_kg);
        $this->assertSame('1.00', (string) $item->quantity);
        $this->assertSame('40000.00', (string) $item->total_price);

        $order = Order::firstOrFail();
        $this->assertSame('40000.00', (string) $order->subtotal);
        $this->assertSame('40000.00', (string) $order->total);
    }

    public function test_fractional_portion_quantity_is_still_allowed(): void
    {
        $response = $this->placeOrder([
            ['menu_item_id' => $this->portionItem->id, 'quantity' => 0.7],
        ]);

        $response->assertCreated();
        $this->assertSame('35000.00', (string) Order::firstOrFail()->subtotal);
    }

    // --- payment before "paid" ---------------------------------------------

    public function test_order_cannot_be_marked_paid_without_a_payment(): void
    {
        $orderId = $this->placeOrder([
            ['menu_item_id' => $this->portionItem->id, 'quantity' => 2],
        ])->assertCreated()->json('data.id');

        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'ready'])->assertOk();

        $response = $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'paid']);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'PAYMENT_REQUIRED');
        $this->assertSame('ready', Order::findOrFail($orderId)->status);
    }

    public function test_full_payment_marks_the_order_paid_and_frees_the_table(): void
    {
        Event::fake([OrderStatusUpdated::class]);

        $orderId = $this->placeOrder(
            [['menu_item_id' => $this->portionItem->id, 'quantity' => 2]],
            'dine_in',
            $this->table->id,
        )->assertCreated()->json('data.id');

        $this->assertSame('occupied', $this->table->fresh()->status);

        $response = $this->postJson('/api/v1/payments', [
            'order_id' => $orderId,
            'method' => 'card',
            'amount' => 100000,
        ]);

        $response->assertCreated();
        $this->assertSame('paid', Order::findOrFail($orderId)->status);
        $this->assertSame('free', $this->table->fresh()->status);
        Event::assertDispatched(OrderStatusUpdated::class);
    }

    public function test_partial_payment_leaves_the_order_open_and_the_table_occupied(): void
    {
        $orderId = $this->placeOrder(
            [['menu_item_id' => $this->portionItem->id, 'quantity' => 2]],
            'dine_in',
            $this->table->id,
        )->assertCreated()->json('data.id');

        $this->postJson('/api/v1/payments', [
            'order_id' => $orderId,
            'method' => 'card',
            'amount' => 40000,
        ])->assertCreated();

        $this->assertSame('preparing', Order::findOrFail($orderId)->status);
        $this->assertSame('occupied', $this->table->fresh()->status);

        $this->postJson('/api/v1/payments', [
            'order_id' => $orderId,
            'method' => 'card',
            'amount' => 60000,
        ])->assertCreated();

        $this->assertSame('paid', Order::findOrFail($orderId)->status);
        $this->assertSame('free', $this->table->fresh()->status);
    }

    public function test_a_paid_order_cannot_be_paid_again(): void
    {
        $orderId = $this->placeOrder([
            ['menu_item_id' => $this->portionItem->id, 'quantity' => 2],
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/v1/payments', [
            'order_id' => $orderId, 'method' => 'card', 'amount' => 100000,
        ])->assertCreated();

        $response = $this->postJson('/api/v1/payments', [
            'order_id' => $orderId, 'method' => 'card', 'amount' => 100000,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'ORDER_NOT_PAYABLE');
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_card_overpayment_is_rejected(): void
    {
        $orderId = $this->placeOrder([
            ['menu_item_id' => $this->portionItem->id, 'quantity' => 2],
        ])->assertCreated()->json('data.id');

        $response = $this->postJson('/api/v1/payments', [
            'order_id' => $orderId, 'method' => 'card', 'amount' => 120000,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'AMOUNT_EXCEEDS_REMAINING');
        $this->assertDatabaseCount('payments', 0);
        $this->assertSame('preparing', Order::findOrFail($orderId)->status);
    }

    // --- table release / broadcasts ----------------------------------------

    public function test_cancelling_an_order_frees_the_table_and_broadcasts(): void
    {
        Event::fake([OrderStatusUpdated::class]);

        $orderId = $this->placeOrder(
            [['menu_item_id' => $this->portionItem->id, 'quantity' => 1]],
            'dine_in',
            $this->table->id,
        )->assertCreated()->json('data.id');

        $this->assertSame('occupied', $this->table->fresh()->status);

        $this->postJson("/api/v1/orders/{$orderId}/cancel", ['reason' => 'Mijoz rad etdi'])
            ->assertOk();

        $this->assertSame('cancelled', Order::findOrFail($orderId)->status);
        $this->assertSame('free', $this->table->fresh()->status);
        Event::assertDispatched(OrderStatusUpdated::class);
    }

    public function test_table_stays_occupied_while_another_order_is_active(): void
    {
        $firstId = $this->placeOrder(
            [['menu_item_id' => $this->portionItem->id, 'quantity' => 1]],
            'dine_in',
            $this->table->id,
        )->assertCreated()->json('data.id');

        $this->placeOrder(
            [['menu_item_id' => $this->portionItem->id, 'quantity' => 1]],
            'dine_in',
            $this->table->id,
        )->assertCreated();

        $this->postJson("/api/v1/orders/{$firstId}/cancel", ['reason' => 'Xato kiritildi'])
            ->assertOk();

        $this->assertSame('occupied', $this->table->fresh()->status);
    }

    // --- Telegram Mini App entry point --------------------------------------

    private function makeInitData(int $telegramId): string
    {
        $params = [
            'auth_date' => (string) time(),
            'query_id' => 'AAH',
            'user' => json_encode(['id' => $telegramId, 'first_name' => 'Ali']),
        ];

        ksort($params);
        $pairs = [];
        foreach ($params as $k => $v) {
            $pairs[] = "{$k}={$v}";
        }

        $secret = hash_hmac('sha256', self::BOT_TOKEN, 'WebAppData', true);
        $hash = hash_hmac('sha256', implode("\n", $pairs), $secret);

        return http_build_query(array_merge($params, ['hash' => $hash]));
    }

    public function test_telegram_order_cannot_underpay_a_portion_item_with_a_weight(): void
    {
        // Telegram customers are not Sanctum users: drop the staff session so
        // the request runs without an authenticated user (no CompanyScope).
        $this->app['auth']->forgetGuards();

        $response = $this->withHeaders([
            'X-Telegram-Init-Data' => $this->makeInitData(910001),
        ])->postJson('/api/v1/tg/orders?company=pricing-co', [
            'branch_id' => $this->branch->id,
            'items' => [[
                'menu_item_id' => $this->portionItem->id,
                'quantity' => 5,
                'weight_kg' => 0.001,
            ]],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('items.0.weight_kg');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_telegram_order_prices_a_weight_item_correctly(): void
    {
        // Telegram customers are not Sanctum users: drop the staff session so
        // the request runs without an authenticated user (no CompanyScope).
        $this->app['auth']->forgetGuards();

        $response = $this->withHeaders([
            'X-Telegram-Init-Data' => $this->makeInitData(910002),
        ])->postJson('/api/v1/tg/orders?company=pricing-co', [
            'branch_id' => $this->branch->id,
            'items' => [[
                'menu_item_id' => $this->weightItem->id,
                'quantity' => 1,
                'weight_kg' => 0.4,
            ]],
        ]);

        $response->assertCreated();
        $this->assertSame('32000.00', (string) Order::firstOrFail()->total);
    }

    // --- editing an order ---------------------------------------------------

    public function test_editing_an_order_reclamps_the_discount_and_never_goes_negative(): void
    {
        $orderId = $this->placeOrder([
            ['menu_item_id' => $this->portionItem->id, 'quantity' => 2],
        ])->assertCreated()->json('data.id');

        // 20% of 100000 is the company maximum.
        $this->postJson("/api/v1/orders/{$orderId}/discount", [
            'discount_type' => 'fixed',
            'discount_value' => 20000,
        ])->assertOk();

        $this->assertSame('80000.00', (string) Order::findOrFail($orderId)->total);

        // Shrink the order to a single 10000 line: the stored 20000 discount
        // must be re-clamped instead of driving the total below zero.
        $this->putJson("/api/v1/orders/{$orderId}", [
            'items' => [['menu_item_id' => $this->portionItem->id, 'quantity' => 0.2]],
        ])->assertOk();

        $order = Order::findOrFail($orderId);
        $this->assertSame('10000.00', (string) $order->subtotal);
        $this->assertSame('2000.00', (string) $order->discount_amount);
        $this->assertSame('8000.00', (string) $order->total);
        $this->assertGreaterThanOrEqual(0, (float) $order->total);
    }

    public function test_editing_an_order_enforces_sell_type_rules(): void
    {
        $orderId = $this->placeOrder([
            ['menu_item_id' => $this->portionItem->id, 'quantity' => 2],
        ])->assertCreated()->json('data.id');

        $response = $this->putJson("/api/v1/orders/{$orderId}", [
            'items' => [[
                'menu_item_id' => $this->portionItem->id,
                'quantity' => 5,
                'weight_kg' => 0.001,
            ]],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('items.0.weight_kg');

        // The original line must survive the rolled-back edit.
        $this->assertSame('100000.00', (string) Order::findOrFail($orderId)->total);
        $this->assertDatabaseCount('order_items', 1);
    }
}
