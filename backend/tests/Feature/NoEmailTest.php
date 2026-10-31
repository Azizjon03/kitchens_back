<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Email tizimda ishlatilmaydi — bazada ham, API'da ham yo'q. */
class NoEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_columns_and_reset_tokens_table_are_gone(): void
    {
        $this->assertFalse(Schema::hasColumn('users', 'email'));
        $this->assertFalse(Schema::hasColumn('users', 'email_verified_at'));
        $this->assertFalse(Schema::hasColumn('companies', 'email'));
        $this->assertFalse(Schema::hasTable('password_reset_tokens'));
    }

    public function test_company_with_owner_is_created_without_any_email(): void
    {
        Plan::create(['name' => 'free', 'display_name' => 'Free', 'price_monthly' => 0, 'max_branches' => 1, 'max_staff' => 5, 'is_active' => true]);
        Sanctum::actingAs(User::create([
            'name' => 'Super', 'phone' => '+998906921469', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true,
        ]));

        $res = $this->postJson('/api/v1/super/companies', [
            'name' => 'Emailsiz', 'slug' => 'emailsiz', 'phone' => '+998700000001',
            'owner_full_name' => 'Ega', 'owner_phone' => '+998901112233', 'owner_password' => 'secret123',
        ])->assertCreated();

        $this->assertArrayNotHasKey('email', $res->json('data'));
    }
}
