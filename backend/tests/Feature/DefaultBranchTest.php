<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #21: kompaniya "Asosiy filial" bilan yaratiladi; bitta filial bo'lsa branch_id
 * yuborish shart emas (UI filial maydonini ko'rsatmaydi). Ikki filialda — majburiy.
 */
class DefaultBranchTest extends TestCase
{
    use RefreshDatabase;

    private function companyWithAdmin(int $branches = 1): array
    {
        $company = Company::create(['name' => 'Bir joy', 'slug' => 'bir-joy', 'phone' => '+998700000000', 'is_active' => true]);
        $created = [];
        for ($i = 1; $i <= $branches; $i++) {
            $created[] = Branch::create(['company_id' => $company->id, 'name' => "Filial {$i}", 'is_active' => true]);
        }
        $admin = User::create([
            'company_id' => $company->id, 'name' => 'Admin', 'phone' => '+998900000001',
            'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true,
        ]);

        return [$company, $created, $admin];
    }

    public function test_new_company_gets_a_main_branch(): void
    {
        Plan::create(['name' => 'free', 'display_name' => 'Free', 'price_monthly' => 0, 'max_branches' => 1, 'max_staff' => 5, 'is_active' => true]);
        Sanctum::actingAs(User::create([
            'name' => 'Super', 'phone' => '+998906921469', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true,
        ]));

        $this->postJson('/api/v1/super/companies', [
            'name' => 'Yangi restoran', 'slug' => 'yangi', 'phone' => '+998700000001',
            'owner_full_name' => 'Ega', 'owner_phone' => '+998901112233', 'owner_password' => 'secret123',
        ])->assertCreated();

        $company = Company::where('slug', 'yangi')->firstOrFail();
        $branches = Branch::withoutGlobalScopes()->where('company_id', $company->id)->get();
        $this->assertCount(1, $branches);
        $this->assertSame('Asosiy filial', $branches->first()->name);
        $this->assertTrue((bool) $branches->first()->is_active);
    }

    public function test_single_branch_is_used_when_branch_id_is_omitted(): void
    {
        [$company, [$branch], $admin] = $this->companyWithAdmin(1);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/tables', ['number' => 'A1', 'seats' => 4])
            ->assertCreated()->assertJsonPath('data.branch_id', $branch->id);

        $staff = $this->postJson('/api/v1/users', [
            'name' => 'Ofitsiant', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123',
        ])->assertCreated();
        $this->assertSame($branch->id, User::find($staff->json('data.id'))->branch_id);

        $category = Category::create(['company_id' => $company->id, 'name_uz' => 'Taomlar', 'sort_order' => 1, 'is_active' => true]);
        $item = MenuItem::create([
            'company_id' => $company->id, 'category_id' => $category->id, 'name_uz' => 'Osh',
            'sell_type' => 'portion', 'price' => 45000, 'is_available' => true,
        ]);
        $this->postJson('/api/v1/orders', ['type' => 'takeaway', 'items' => [['menu_item_id' => $item->id, 'quantity' => 1]]])
            ->assertCreated()->assertJsonPath('data.branch_id', $branch->id);

        $this->postJson('/api/v1/cash-shifts/open', ['opening_amount' => 0])
            ->assertCreated()->assertJsonPath('data.branch_id', $branch->id);
    }

    public function test_with_two_branches_branch_id_is_still_required(): void
    {
        [, , $admin] = $this->companyWithAdmin(2);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/tables', ['number' => 'A1', 'seats' => 4])
            ->assertStatus(422)->assertJsonValidationErrors('branch_id');
    }

    public function test_migration_adds_main_branch_to_companies_without_one(): void
    {
        $empty = Company::create(['name' => 'Filialsiz', 'slug' => 'filialsiz', 'phone' => '+998700000000', 'is_active' => true]);
        $waiter = User::create([
            'company_id' => $empty->id, 'name' => 'Ofitsiant', 'phone' => '+998900000003',
            'role' => 'waiter', 'password' => 'secret123', 'is_active' => true,
        ]);
        [$withBranch] = $this->companyWithAdmin(1);

        $migration = require database_path('migrations/2026_10_31_000002_add_main_branch_to_companies_without_branches.php');
        $migration->up();

        $branch = Branch::withoutGlobalScopes()->where('company_id', $empty->id)->sole();
        $this->assertSame('Asosiy filial', $branch->name);
        $this->assertSame($branch->id, $waiter->fresh()->branch_id);
        $this->assertSame(1, Branch::withoutGlobalScopes()->where('company_id', $withBranch->id)->count());
    }
}
