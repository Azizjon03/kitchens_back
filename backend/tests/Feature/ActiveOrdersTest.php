<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * KDS va ofitsiant ekrani filialning BARCHA faol buyurtmalarini ko'rishi kerak (#5).
 * Avval `paginate(20)` + `orderByDesc` sababli 20 dan ortig'ida eng eski buyurtmalar yo'qolardi.
 */
class ActiveOrdersTest extends TestCase
{
    use RefreshDatabase;

    private function scenario(): array
    {
        $company = Company::create(['name' => 'KDS', 'slug' => 'kds', 'phone' => '+998900000000', 'is_active' => true]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Main', 'is_active' => true]);
        $chef = User::create([
            'company_id' => $company->id, 'branch_id' => $branch->id, 'name' => 'Oshpaz',
            'phone' => '+998900000003', 'role' => 'chef', 'password' => 'secret123', 'is_active' => true,
        ]);

        return [$company, $branch, $chef];
    }

    private function makeOrders(Company $company, Branch $branch, string $status, int $count, Carbon $start): void
    {
        for ($i = 0; $i < $count; $i++) {
            $order = Order::create([
                'company_id' => $company->id, 'branch_id' => $branch->id, 'type' => 'takeaway',
                'status' => $status, 'subtotal' => 1000, 'total' => 1000,
            ]);
            $order->forceFill(['created_at' => $start->copy()->addMinutes($i)])->save();
        }
    }

    public function test_active_mode_returns_all_orders_oldest_first(): void
    {
        [$company, $branch, $chef] = $this->scenario();
        $this->makeOrders($company, $branch, 'preparing', 25, Carbon::parse('2026-10-31 12:00'));
        Sanctum::actingAs($chef);

        $res = $this->getJson("/api/v1/orders?branch_id={$branch->id}&status=preparing&active=1")->assertOk();

        $orders = $res->json('data');
        $this->assertCount(25, $orders, 'Barcha 25 ta faol buyurtma qaytishi kerak');
        $this->assertSame('2026-10-31T12:00:00.000000Z', $orders[0]['created_at'], 'Eng eski buyurtma birinchi');
    }

    public function test_active_mode_accepts_several_statuses_and_skips_terminal_ones(): void
    {
        [$company, $branch, $chef] = $this->scenario();
        $start = Carbon::parse('2026-10-31 12:00');
        $this->makeOrders($company, $branch, 'preparing', 2, $start);
        $this->makeOrders($company, $branch, 'ready', 3, $start);
        $this->makeOrders($company, $branch, 'paid', 4, $start);
        Sanctum::actingAs($chef);

        $res = $this->getJson("/api/v1/orders?branch_id={$branch->id}&status=preparing,ready&active=1")->assertOk();

        $this->assertCount(5, $res->json('data'));
    }

    public function test_regular_listing_stays_paginated(): void
    {
        [$company, $branch, $chef] = $this->scenario();
        $this->makeOrders($company, $branch, 'preparing', 25, Carbon::parse('2026-10-31 12:00'));
        Sanctum::actingAs($chef);

        $this->getJson("/api/v1/orders?branch_id={$branch->id}&status=preparing")
            ->assertOk()
            ->assertJsonPath('data.per_page', 20)
            ->assertJsonCount(20, 'data.data');
    }
}
