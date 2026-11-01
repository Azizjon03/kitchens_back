<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** #49: zallar — butun zalga bitta buyurtma yoki har so'riga alohida, aralashmaydi. */
class TableGroupTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private User $admin;
    private User $waiter;
    private MenuItem $item;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::create(['name' => 'Archazor', 'slug' => 'archazor', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $this->admin = User::create(['company_id' => $this->company->id, 'name' => 'Rahbar', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]);
        $this->waiter = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'W', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        $cat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'T', 'is_active' => true]);
        $this->item = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $cat->id, 'name_uz' => 'Osh', 'price' => 45000, 'is_available' => true]);
    }

    /** @return array{0: int, 1: array<int, int>} [zal id, so'rilar id] */
    private function hall(): array
    {
        $ids = [];
        foreach (range(1, 4) as $i) {
            $ids[] = Table::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'number' => "Katta zal so'ri {$i}", 'seats' => 8, 'status' => 'free'])->id;
        }
        Sanctum::actingAs($this->admin);
        $group = $this->postJson('/api/v1/table-groups', ['name' => 'Katta zal', 'allow_whole' => true, 'table_ids' => $ids])->assertCreated()->json('data.id');

        return [$group, $ids];
    }

    private function wholeTable(int $group): Table
    {
        return Table::where('table_group_id', $group)->where('is_whole_group', true)->firstOrFail();
    }

    private function orderOn(int $tableId): int
    {
        Sanctum::actingAs($this->waiter);

        return $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'branch_id' => $this->branch->id, 'table_id' => $tableId, 'items' => [['menu_item_id' => $this->item->id, 'quantity' => 1]]])
            ->assertCreated()->json('data.id');
    }

    private function statuses(int $group): array
    {
        return Table::where('table_group_id', $group)->orderBy('id')->pluck('status', 'number')->all();
    }

    public function test_whole_hall_table_created_with_total_seats(): void
    {
        [$group] = $this->hall();
        $whole = $this->wholeTable($group);
        $this->assertSame('Katta zal', $whole->number);
        $this->assertSame(32, $whole->seats);

        // Zalga stol qo'shilsa — sig'im yangilanadi; ruxsat o'chirilsa — butun zal joyi yo'qoladi
        $this->postJson('/api/v1/tables', ['number' => "Katta zal so'ri 5", 'seats' => 6, 'branch_id' => $this->branch->id, 'table_group_id' => $group])->assertCreated();
        $this->assertSame(38, $this->wholeTable($group)->fresh()->seats);
        $this->putJson("/api/v1/table-groups/{$group}", ['allow_whole' => false])->assertOk();
        $this->assertSame(0, Table::where('table_group_id', $group)->where('is_whole_group', true)->count());
    }

    public function test_whole_hall_order_blocks_members_and_frees_after_payment(): void
    {
        [$group, $ids] = $this->hall();
        $whole = $this->wholeTable($group);
        $orderId = $this->orderOn($whole->id);

        $this->assertSame(['occupied'], array_values(array_unique($this->statuses($group))));

        // Yopilsa — hammasi bo'shaydi
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/orders/{$orderId}/cancel", ['reason' => 'test'])->assertOk();
        $this->assertSame(['free'], array_values(array_unique($this->statuses($group))));
    }

    public function test_member_order_blocks_whole_hall_only(): void
    {
        [$group, $ids] = $this->hall();
        $orderId = $this->orderOn($ids[0]);

        $st = $this->statuses($group);
        $this->assertSame('occupied', $st["Katta zal so'ri 1"]);
        $this->assertSame('free', $st["Katta zal so'ri 2"]);
        $this->assertSame('occupied', $st['Katta zal']);

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/orders/{$orderId}/cancel", ['reason' => 'test'])->assertOk();
        $this->assertSame('free', $this->wholeTable($group)->fresh()->status);
    }

    public function test_zone_text_migrates_and_rules(): void
    {
        [$group] = $this->hall();
        // Butun zal joyini to'g'ridan-to'g'ri o'chirib/tahrirlab bo'lmaydi
        $whole = $this->wholeTable($group);
        $this->deleteJson("/api/v1/tables/{$whole->id}")->assertStatus(422);
        $this->putJson("/api/v1/tables/{$whole->id}", ['seats' => 100])->assertStatus(422);
        // Nom takrorlanmaydi; ofitsiant zal yarata olmaydi, lekin ko'radi
        $this->postJson('/api/v1/table-groups', ['name' => 'Katta zal', 'branch_id' => $this->branch->id])->assertStatus(422);
        Sanctum::actingAs($this->waiter);
        $this->postJson('/api/v1/table-groups', ['name' => 'X', 'branch_id' => $this->branch->id])->assertForbidden();
        $this->getJson('/api/v1/table-groups')->assertOk()->assertJsonPath('data.0.tables_count', 4);
        // Zal o'chirilsa — stollar qoladi, guruhsiz
        Sanctum::actingAs($this->admin);
        $this->deleteJson("/api/v1/table-groups/{$group}")->assertOk();
        $this->assertSame(4, Table::whereNull('table_group_id')->count());
    }
}
