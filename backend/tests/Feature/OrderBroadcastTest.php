<?php

namespace Tests\Feature;

use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderBroadcastTest extends TestCase
{
    use RefreshDatabase;

    private function scenario(): array
    {
        $company = Company::create([
            'name' => 'KDS Co', 'slug' => 'kds-co', 'phone' => '+998900000000', 'is_active' => true,
            'settings_json' => ['service_charge_pct' => 0],
        ]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Main', 'is_active' => true]);
        $waiter = User::create([
            'company_id' => $company->id, 'branch_id' => $branch->id, 'name' => 'Waiter',
            'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true,
        ]);
        $category = Category::create(['company_id' => $company->id, 'name_uz' => 'Cat', 'sort_order' => 1, 'is_active' => true]);
        $item = MenuItem::create([
            'company_id' => $company->id, 'category_id' => $category->id, 'name_uz' => 'Lagman',
            'sell_type' => 'portion', 'price' => 40000, 'is_available' => true,
        ]);

        return [$company, $branch, $waiter, $item];
    }

    public function test_creating_an_order_broadcasts_order_created(): void
    {
        Event::fake([OrderCreated::class]);

        [, $branch, $waiter, $item] = $this->scenario();
        Sanctum::actingAs($waiter);

        $response = $this->postJson('/api/v1/orders', [
            'branch_id' => $branch->id,
            'type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ]);

        $response->assertCreated();
        Event::assertDispatched(OrderCreated::class);
    }

    public function test_marking_ready_broadcasts_status_update(): void
    {
        Event::fake([OrderStatusUpdated::class]);

        [$company, $branch, $waiter, $item] = $this->scenario();

        $order = Order::create([
            'company_id' => $company->id, 'branch_id' => $branch->id, 'user_id' => $waiter->id,
            'type' => 'takeaway', 'status' => 'preparing', 'subtotal' => 40000, 'total' => 40000,
        ]);

        Sanctum::actingAs($waiter);

        $response = $this->patchJson("/api/v1/orders/{$order->id}/status", ['status' => 'ready']);

        $response->assertOk();
        Event::assertDispatched(OrderStatusUpdated::class);
    }
}
