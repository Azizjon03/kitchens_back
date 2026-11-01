<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** #42: telefon raqam standarti — +998 va 9 raqam, bir xil saqlanadi va ko'rsatiladi. */
class PhoneStandardTest extends TestCase
{
    use RefreshDatabase;

    public function test_normalize_and_format_accept_any_common_spelling(): void
    {
        foreach (['+998 (90) 123-45-67', '998901234567', '90 123 45 67', '901234567', '+998901234567'] as $raw) {
            $this->assertSame('+998901234567', Phone::normalize($raw), $raw);
            $this->assertSame('+998 (90) 123-45-67', Phone::format($raw), $raw);
        }
        $this->assertSame('+12025550123', Phone::normalize('+1 202 555 0123'));
        $this->assertSame('+1 202 555 0123', Phone::format('+1 202 555 0123'));
    }

    public function test_login_with_local_nine_digits_and_models_store_e164(): void
    {
        $company = Company::create(['name' => 'A', 'slug' => 'a', 'phone' => '69 123 45 67', 'is_active' => true]);
        $this->assertSame('+998691234567', $company->fresh()->phone);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'F', 'phone' => '+998 (90) 111-22-33', 'is_active' => true]);
        $this->assertSame('+998901112233', $branch->fresh()->phone);

        User::create(['company_id' => $company->id, 'name' => 'W', 'phone' => '+998900000003', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        $this->postJson('/api/v1/auth/login', ['phone' => '90 000 00 03', 'password' => 'secret123'])->assertOk()->assertJsonStructure(['data' => ['token']]);
    }
}
