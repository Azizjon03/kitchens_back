<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kassir smenasi: ochish → to'lov → kutilgan summa → yopish.
 * Rol QA'da topilgan bug: ochiq smenada expected_amount null edi, UI ochilish
 * summasini "kutilgan" deb ko'rsatardi va kassir smenani yopa olmasdi.
 */
class CashShiftFlowTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    private function cashier(): User
    {
        $company = Company::create(['name' => 'Kassa Co', 'slug' => 'kassa-co', 'phone' => '+998700000000', 'is_active' => true]);
        $this->branch = Branch::create(['company_id' => $company->id, 'name' => 'Markaziy', 'is_active' => true]);

        return User::create([
            'company_id' => $company->id, 'branch_id' => $this->branch->id, 'name' => 'Kassir',
            'phone' => '+998900000005', 'role' => 'cashier', 'password' => 'secret123', 'is_active' => true,
        ]);
    }

    private function order(int $total): Order
    {
        return Order::create([
            'company_id' => $this->branch->company_id, 'branch_id' => $this->branch->id, 'type' => 'takeaway',
            'status' => 'ready', 'subtotal' => $total, 'total' => $total,
        ]);
    }

    public function test_current_shift_shows_live_expected_cash_amount(): void
    {
        Sanctum::actingAs($this->cashier());
        $this->postJson('/api/v1/cash-shifts/open', ['branch_id' => $this->branch->id, 'opening_amount' => 100000])->assertCreated();

        $this->postJson('/api/v1/payments', ['order_id' => $this->order(45000)->id, 'method' => 'cash', 'amount' => 50000])->assertCreated();
        $this->postJson('/api/v1/payments', ['order_id' => $this->order(30000)->id, 'method' => 'card', 'amount' => 30000])->assertCreated();

        // 100 000 + 50 000 naqd − 5 000 qaytim; karta kassaga kirmaydi
        $this->getJson('/api/v1/cash-shifts/current')
            ->assertOk()
            ->assertJsonPath('data.expected_amount', '145000.00');
    }

    public function test_closing_with_the_expected_amount_needs_no_reason(): void
    {
        Sanctum::actingAs($this->cashier());
        $this->postJson('/api/v1/cash-shifts/open', ['branch_id' => $this->branch->id, 'opening_amount' => 100000])->assertCreated();
        $this->postJson('/api/v1/payments', ['order_id' => $this->order(45000)->id, 'method' => 'cash', 'amount' => 45000])->assertCreated();

        $expected = $this->getJson('/api/v1/cash-shifts/current')->json('data.expected_amount');

        $this->postJson('/api/v1/cash-shifts/close', ['closing_amount' => $expected])
            ->assertOk()
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.difference', '0.00');
    }

    public function test_difference_without_reason_is_explained_in_uzbek(): void
    {
        $this->app->setLocale('uz');
        Sanctum::actingAs($this->cashier());
        $this->postJson('/api/v1/cash-shifts/open', ['branch_id' => $this->branch->id, 'opening_amount' => 100000])->assertCreated();

        $res = $this->postJson('/api/v1/cash-shifts/close', ['closing_amount' => 90000])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'DIFFERENCE_REASON_REQUIRED');

        $this->assertStringContainsString('sabab', $res->json('error.message'));
    }
}
