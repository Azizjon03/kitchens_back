<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Modifier;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers the tenant / attachment / availability guards added to the ordering
 * and menu-item paths:
 *
 * - OrderService::syncItems() now requires every modifier_id/addon_id to be
 *   an integer that belongs to the ordering company AND is attached to the
 *   specific menu item being ordered (menu_item_modifiers / menu_item_addons)
 *   — a foreign, unknown, malformed, or unattached id fails the whole order
 *   with a 422 instead of being silently dropped or reaching the database in
 *   a shape that could blow up as a 500.
 * - OrderService::syncItems() now also rejects a line whose menu item is
 *   unavailable, or whose category is inactive.
 * - MenuItemController now rejects an invalid sell_type and a `weight` item
 *   saved with a non-positive weight_step.
 * - Tg/MenuController exposes service_charge_pct so the Mini App can show
 *   the real total before checkout, and MenuService hides inactive
 *   modifiers/addons from the menu payload.
 */
class MenuValidationTest extends TestCase
{
    use RefreshDatabase;

    private const BOT_TOKEN = '123456:menu-validation-bot-token';

    private Company $company;

    private Branch $branch;

    private Category $category;

    private MenuItem $item;

    private Modifier $activeModifier;

    private Modifier $inactiveModifier;

    private Addon $attachedAddon;

    private Addon $unattachedAddon;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create([
            'name' => 'Validation Co',
            'slug' => 'validation-co',
            'phone' => '+998900000200',
            'is_active' => true,
            'settings_json' => [
                'service_charge_pct' => 12.5,
                'telegram_bot_token' => self::BOT_TOKEN,
            ],
        ]);

        $this->branch = Branch::create([
            'company_id' => $this->company->id, 'name' => 'Main', 'is_active' => true,
        ]);

        $this->admin = User::create([
            'company_id' => $this->company->id, 'branch_id' => $this->branch->id,
            'name' => 'Admin', 'phone' => '+998900000201', 'role' => 'company_admin',
            'password' => 'secret123', 'is_active' => true,
        ]);

        $this->category = Category::create([
            'company_id' => $this->company->id, 'name_uz' => 'Taomlar',
            'sort_order' => 1, 'is_active' => true,
        ]);

        $this->item = MenuItem::create([
            'company_id' => $this->company->id, 'category_id' => $this->category->id,
            'name_uz' => 'Osh', 'sell_type' => 'portion', 'price' => 20000,
            'is_available' => true,
        ]);

        $this->activeModifier = Modifier::create([
            'company_id' => $this->company->id, 'name_uz' => 'Achchiq', 'is_active' => true,
        ]);

        $this->inactiveModifier = Modifier::create([
            'company_id' => $this->company->id, 'name_uz' => "To'xtatilgan", 'is_active' => false,
        ]);

        DB::table('menu_item_modifiers')->insert([
            ['menu_item_id' => $this->item->id, 'modifier_id' => $this->activeModifier->id],
            ['menu_item_id' => $this->item->id, 'modifier_id' => $this->inactiveModifier->id],
        ]);

        $this->attachedAddon = Addon::create([
            'company_id' => $this->company->id, 'name_uz' => 'Non', 'price' => 3000, 'is_active' => true,
        ]);

        $this->unattachedAddon = Addon::create([
            'company_id' => $this->company->id, 'name_uz' => 'Salat', 'price' => 5000, 'is_active' => true,
        ]);

        DB::table('menu_item_addons')->insert([
            'menu_item_id' => $this->item->id, 'addon_id' => $this->attachedAddon->id,
        ]);
    }

    private function makeInitData(int $telegramId): string
    {
        $params = [
            'auth_date' => (string) time(),
            'query_id' => 'AAH',
            'user' => json_encode(['id' => $telegramId, 'first_name' => 'Test']),
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

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function placeTelegramOrder(array $items, int $telegramId): TestResponse
    {
        // Telegram customers are not Sanctum users: drop any staff session so
        // the request runs without an authenticated user (no CompanyScope).
        $this->app['auth']->forgetGuards();

        return $this->withHeaders([
            'X-Telegram-Init-Data' => $this->makeInitData($telegramId),
        ])->postJson('/api/v1/tg/orders?company=validation-co', [
            'branch_id' => $this->branch->id,
            'items' => $items,
        ]);
    }

    // --- modifier_ids / addon_ids -------------------------------------------

    public function test_foreign_company_modifier_id_is_rejected_with_422_not_500(): void
    {
        $otherCompany = Company::create([
            'name' => 'Other Co', 'slug' => 'other-co', 'phone' => '+998900000300', 'is_active' => true,
        ]);
        $foreignModifier = Modifier::create([
            'company_id' => $otherCompany->id, 'name_uz' => 'Begona', 'is_active' => true,
        ]);

        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $this->item->id, 'quantity' => 1, 'modifier_ids' => [$foreignModifier->id]],
        ], 810001);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_item_modifiers', 0);
    }

    public function test_nonexistent_modifier_id_is_rejected_with_422(): void
    {
        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $this->item->id, 'quantity' => 1, 'modifier_ids' => [999999]],
        ], 810002);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_non_integer_modifier_id_is_rejected_with_422_not_500(): void
    {
        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $this->item->id, 'quantity' => 1, 'modifier_ids' => ['not-an-id']],
        ], 810003);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_addon_not_attached_to_the_item_is_rejected_with_422(): void
    {
        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $this->item->id, 'quantity' => 1, 'addon_ids' => [$this->unattachedAddon->id]],
        ], 810004);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_item_addons', 0);
    }

    public function test_inactive_modifier_id_is_rejected_with_422(): void
    {
        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $this->item->id, 'quantity' => 1, 'modifier_ids' => [$this->inactiveModifier->id]],
        ], 810005);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_valid_modifier_and_addon_are_accepted_and_priced(): void
    {
        $response = $this->placeTelegramOrder([
            [
                'menu_item_id' => $this->item->id,
                'quantity' => 1,
                'modifier_ids' => [$this->activeModifier->id],
                'addon_ids' => [$this->attachedAddon->id],
            ],
        ], 810006);

        $response->assertCreated();
        // 20000 (item) + 3000 (addon); modifiers carry no price by design.
        $this->assertSame('23000.00', (string) Order::firstOrFail()->subtotal);
        $this->assertDatabaseCount('order_item_modifiers', 1);
        $this->assertDatabaseCount('order_item_addons', 1);
    }

    // --- menu item / category availability ----------------------------------

    public function test_unavailable_menu_item_cannot_be_ordered(): void
    {
        $unavailable = MenuItem::create([
            'company_id' => $this->company->id, 'category_id' => $this->category->id,
            'name_uz' => 'Tugagan taom', 'sell_type' => 'portion', 'price' => 15000,
            'is_available' => false,
        ]);

        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $unavailable->id, 'quantity' => 1],
        ], 810007);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_item_in_an_inactive_category_cannot_be_ordered(): void
    {
        $inactiveCategory = Category::create([
            'company_id' => $this->company->id, 'name_uz' => "Yopilgan bo'lim",
            'sort_order' => 2, 'is_active' => false,
        ]);

        $item = MenuItem::create([
            'company_id' => $this->company->id, 'category_id' => $inactiveCategory->id,
            'name_uz' => 'Yopiq taom', 'sell_type' => 'portion', 'price' => 15000,
            'is_available' => true,
        ]);

        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $item->id, 'quantity' => 1],
        ], 810008);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_menu_item_from_another_company_cannot_be_ordered(): void
    {
        $otherCompany = Company::create([
            'name' => 'Other Co 2', 'slug' => 'other-co-2', 'phone' => '+998900000301', 'is_active' => true,
        ]);
        $otherCategory = Category::create([
            'company_id' => $otherCompany->id, 'name_uz' => 'Boshqa', 'sort_order' => 1, 'is_active' => true,
        ]);
        $otherItem = MenuItem::create([
            'company_id' => $otherCompany->id, 'category_id' => $otherCategory->id,
            'name_uz' => 'Boshqa taom', 'sell_type' => 'portion', 'price' => 10000, 'is_available' => true,
        ]);

        $response = $this->placeTelegramOrder([
            ['menu_item_id' => $otherItem->id, 'quantity' => 1],
        ], 810009);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    // --- /tg/menu -------------------------------------------------------------

    public function test_tg_menu_response_includes_service_charge_pct(): void
    {
        $this->app['auth']->forgetGuards();

        $response = $this->withHeaders([
            'X-Telegram-Init-Data' => $this->makeInitData(810010),
        ])->getJson('/api/v1/tg/menu?company=validation-co');

        $response->assertOk();
        $response->assertJsonPath('data.service_charge_pct', 12.5);
    }

    public function test_inactive_modifier_is_not_shown_in_the_menu_response(): void
    {
        $this->app['auth']->forgetGuards();

        $response = $this->withHeaders([
            'X-Telegram-Init-Data' => $this->makeInitData(810011),
        ])->getJson('/api/v1/tg/menu?company=validation-co');

        $response->assertOk();

        $modifierIds = collect($response->json('data.menu.0.menu_items.0.modifiers'))->pluck('id');
        $this->assertTrue($modifierIds->contains($this->activeModifier->id));
        $this->assertFalse($modifierIds->contains($this->inactiveModifier->id));
    }

    // --- MenuItemController: sell_type / weight settings ----------------------

    public function test_invalid_sell_type_is_rejected(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Test taom',
            'name_ru' => 'Тест блюдо',
            'sell_type' => 'kilo',
            'price' => 10000,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('sell_type');
        $this->assertDatabaseMissing('menu_items', ['name_uz' => 'Test taom']);
    }

    public function test_weight_item_with_zero_weight_step_is_rejected(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Kabob',
            'name_ru' => 'Кебаб',
            'sell_type' => 'weight',
            'price' => 80000,
            'weight_step' => 0,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('menu_items', ['name_uz' => 'Kabob']);
    }

    public function test_weight_item_without_a_weight_step_is_rejected(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Lag\'mon (kg)',
            'name_ru' => 'Лагман (кг)',
            'sell_type' => 'weight',
            'price' => 60000,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('menu_items', ['name_ru' => 'Лагман (кг)']);
    }

    public function test_min_weight_not_a_multiple_of_weight_step_is_rejected(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Manti (kg)',
            'name_ru' => 'Манты (кг)',
            'sell_type' => 'weight',
            'price' => 70000,
            'weight_step' => 0.1,
            'min_weight' => 0.35,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('menu_items', ['name_ru' => 'Манты (кг)']);
    }

    public function test_a_valid_weight_item_can_be_saved_and_then_ordered(): void
    {
        Sanctum::actingAs($this->admin);

        $store = $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Kabob (kg)',
            'name_ru' => 'Кебаб (кг)',
            'sell_type' => 'weight',
            'price' => 80000,
            'weight_step' => 0.1,
            'min_weight' => 0.3,
        ]);

        $store->assertCreated();
        $newItemId = $store->json('data.id');

        $order = $this->placeTelegramOrder([
            ['menu_item_id' => $newItemId, 'quantity' => 1, 'weight_kg' => 0.4],
        ], 810012);

        $order->assertCreated();
    }

    public function test_price_must_be_greater_than_zero(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Bepul taom',
            'name_ru' => 'Бесплатное блюдо',
            'price' => 0,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('price');
    }

    public function test_menu_item_cannot_attach_another_companys_category_or_modifier(): void
    {
        $other = Company::create([
            'name' => 'Other Co', 'slug' => 'other-co',
            'phone' => '+998900000299', 'is_active' => true,
        ]);
        $otherCategory = Category::create([
            'company_id' => $other->id, 'name_uz' => 'Begona', 'sort_order' => 1, 'is_active' => true,
        ]);
        $otherModifier = Modifier::create([
            'company_id' => $other->id, 'name_uz' => 'Begona modifikator', 'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        // A foreign category must not be selectable...
        $this->postJson('/api/v1/menu-items', [
            'category_id' => $otherCategory->id,
            'name_uz' => 'Test', 'name_ru' => 'Test', 'price' => 10000,
        ])->assertStatus(422)->assertJsonValidationErrors('category_id');

        // ...nor a foreign modifier, even with a valid own category.
        $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Test', 'name_ru' => 'Test', 'price' => 10000,
            'modifier_ids' => [$otherModifier->id],
        ])->assertStatus(422)->assertJsonValidationErrors('modifier_ids.0');

        // The company's own records still work.
        $this->postJson('/api/v1/menu-items', [
            'category_id' => $this->category->id,
            'name_uz' => 'Test', 'name_ru' => 'Test', 'price' => 10000,
            'modifier_ids' => [$this->activeModifier->id],
        ])->assertCreated();
    }
}
