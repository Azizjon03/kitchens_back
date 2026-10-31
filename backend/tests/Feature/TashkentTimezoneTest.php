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
 * Ilova O'zbekiston vaqtida ishlaydi (Asia/Tashkent, UTC+5). Avval hammasi UTC'da
 * edi: Toshkent bo'yicha 00:00–05:00 dagi buyurtmalar sana filtrida oldingi kunga tushardi.
 */
class TashkentTimezoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_application_runs_in_tashkent_time(): void
    {
        $this->assertSame('Asia/Tashkent', config('app.timezone'));
        $this->assertSame('Asia/Tashkent', date_default_timezone_get());
        $this->assertSame(5 * 3600, now()->getOffset());
    }

    public function test_night_order_belongs_to_the_tashkent_calendar_day(): void
    {
        $company = Company::create(['name' => 'Tun', 'slug' => 'tun', 'phone' => '+998700000000', 'is_active' => true]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Markaziy', 'is_active' => true]);
        $cashier = User::create([
            'company_id' => $company->id, 'branch_id' => $branch->id, 'name' => 'Kassir',
            'phone' => '+998900000005', 'role' => 'cashier', 'password' => 'secret123', 'is_active' => true,
        ]);

        // Buyurtma 31-oktabr Toshkent vaqti bilan 02:00 da beriladi (UTC bo'yicha hali 30-oktabr 21:00).
        // created_at ilova "hozir"idan yoziladi — real oqimdagidek.
        Carbon::setTestNow(Carbon::parse('2026-10-31 02:00', 'Asia/Tashkent'));
        Order::create([
            'company_id' => $company->id, 'branch_id' => $branch->id, 'type' => 'takeaway',
            'status' => 'paid', 'subtotal' => 1000, 'total' => 1000,
        ]);
        Carbon::setTestNow();

        Sanctum::actingAs($cashier);

        $this->getJson('/api/v1/orders?date_from=2026-10-31&date_to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        $this->getJson('/api/v1/orders?date_from=2026-10-30&date_to=2026-10-30')
            ->assertOk()
            ->assertJsonPath('data.total', 0);
    }
}
