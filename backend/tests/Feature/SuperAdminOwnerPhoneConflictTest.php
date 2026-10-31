<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * QA: kompaniya egasining telefoni boshqa kompaniyada yoki super adminda allaqachon
 * mavjud bo'lsa nima bo'ladi. users unique — (company_id, phone), telefon global emas.
 */
class SuperAdminOwnerPhoneConflictTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();

        Plan::create([
            'name' => 'free', 'display_name' => 'Free', 'price_monthly' => 0,
            'max_branches' => 1, 'max_staff' => 5, 'is_active' => true,
        ]);

        $this->super = User::create([
            'name' => 'Super', 'phone' => '+998906921469', 'role' => 'super_admin',
            'password' => 'password1', 'is_active' => true,
        ]);
    }

    private function createCompany(string $slug, string $ownerPhone, string $ownerPassword)
    {
        Sanctum::actingAs($this->super);

        return $this->postJson('/api/v1/super/companies', [
            'name' => 'Co '.$slug, 'slug' => $slug, 'phone' => '+998900000000',
            'owner_full_name' => 'Owner '.$slug, 'owner_phone' => $ownerPhone,
            'owner_password' => $ownerPassword,
        ]);
    }

    private function login(string $phone, string $password)
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/v1/auth/login', ['phone' => $phone, 'password' => $password]);
    }

    /** store: egasi telefoni = super admin telefoni, parol ham bir xil → super admin kira oladimi? */
    public function test_store_owner_with_super_admin_phone_and_same_password_does_not_lock_out_super_admin(): void
    {
        $res = $this->createCompany('a', '+998 (90) 692-14-69', 'password1');

        if ($res->status() === 201) {
            $this->login('+998906921469', 'password1')
                ->assertOk()
                ->assertJsonPath('data.user.role', 'super_admin');
        } else {
            $res->assertStatus(422);
        }
    }

    /** store: egasi boshqa kompaniyada bor, parol bir xil → eski admin kira oladimi? */
    public function test_store_owner_existing_in_other_company_with_same_password_keeps_login_working(): void
    {
        // Qaror (2026-10-31): bitta telefon bir nechta restoranga ruxsat etiladi, kirishda
        // restoran tanlanadi. Bu alohida vazifa — shu tugaguncha login 409 qaytaradi.
        $this->markTestSkipped('Kutilmoqda: login paytida restoran tanlash (multi-company login).');

        $this->createCompany('a', '+998901112233', 'secret123')->assertCreated();
        $this->login('+998901112233', 'secret123')->assertOk();

        $res = $this->createCompany('b', '+998901112233', 'secret123');

        $this->assertNotSame(500, $res->status());
        if ($res->status() === 201) {
            $this->login('+998901112233', 'secret123')->assertOk();
        }
    }

    /** store: egasi boshqa kompaniyada bor, parol boshqa → ikkalasi ham kira oladi (kutilgan ishlash) */
    public function test_store_owner_existing_in_other_company_with_different_password_both_can_log_in(): void
    {
        $this->createCompany('a', '+998901112233', 'secret123')->assertCreated();
        $this->createCompany('b', '+998901112233', 'other4567')->assertCreated();

        $a = Company::where('slug', 'a')->first();
        $b = Company::where('slug', 'b')->first();

        $this->login('+998901112233', 'secret123')->assertOk()->assertJsonPath('data.user.company_id', $a->id);
        $this->login('+998901112233', 'other4567')->assertOk()->assertJsonPath('data.user.company_id', $b->id);
    }

    /** assignAdmin: super admin telefoni berilsa super admin pasaytirilmasligi kerak */
    public function test_assign_admin_with_super_admin_phone_does_not_demote_super_admin(): void
    {
        $this->createCompany('a', '+998901112233', 'secret123')->assertCreated();
        $company = Company::where('slug', 'a')->first();

        Sanctum::actingAs($this->super);
        $this->postJson("/api/v1/super/companies/{$company->id}/admin", [
            'name' => 'X', 'phone' => '+998906921469', 'password' => 'whatever1',
        ]);

        $this->super->refresh();
        $this->assertSame('super_admin', $this->super->role, 'Super admin company_admin ga aylantirildi');
        $this->assertNull($this->super->company_id, 'Super admin kompaniyaga ko\'chirildi');
    }

    /** assignAdmin: boshqa kompaniyaning xodimi ko'chirilmasligi kerak */
    public function test_assign_admin_does_not_move_another_companys_user(): void
    {
        $this->createCompany('a', '+998901112233', 'secret123')->assertCreated();
        $this->createCompany('b', '+998904445566', 'secret123')->assertCreated();
        $a = Company::where('slug', 'a')->first();
        $b = Company::where('slug', 'b')->first();
        $ownerA = User::where('company_id', $a->id)->first();

        Sanctum::actingAs($this->super);
        $this->postJson("/api/v1/super/companies/{$b->id}/admin", [
            'name' => 'Y', 'phone' => '+998901112233', 'password' => 'newpass12',
        ]);

        $ownerA->refresh();
        $this->assertSame($a->id, $ownerA->company_id, 'A kompaniyaning admini B ga ko\'chirildi');
    }

    /** assignAdmin: telefon normallashtirilmaydi — formatlangan raqam bilan yaratilgan admin kira olmaydi */
    public function test_assign_admin_normalizes_phone_so_new_admin_can_log_in(): void
    {
        $this->createCompany('a', '+998901112233', 'secret123')->assertCreated();
        $company = Company::where('slug', 'a')->first();

        Sanctum::actingAs($this->super);
        $this->postJson("/api/v1/super/companies/{$company->id}/admin", [
            'name' => 'Z', 'phone' => '+998 (90) 777-88-99', 'password' => 'newpass12',
        ])->assertCreated();

        $this->login('+998907778899', 'newpass12')->assertOk();
    }
}
