<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Menyu ikki darajali: kategoriya → sub-menyu (#23). Ota kategoriya faqat o'z
 * kompaniyasidan va faqat yuqori darajadan bo'ladi.
 */
class CategoryHierarchyTest extends TestCase
{
    use RefreshDatabase;

    private function admin(string $slug): User
    {
        $company = Company::create(['name' => $slug, 'slug' => $slug, 'phone' => '+998700000000', 'is_active' => true]);

        return User::create([
            'company_id' => $company->id, 'name' => 'Admin', 'phone' => '+99890000'.random_int(1000, 9999),
            'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true,
        ]);
    }

    public function test_subcategory_can_be_created_under_own_top_category(): void
    {
        $admin = $this->admin('a');
        Sanctum::actingAs($admin);
        $top = $this->postJson('/api/v1/categories', ['name_uz' => 'Suvlar', 'name_ru' => 'Воды'])->assertCreated();

        $this->postJson('/api/v1/categories', ['name_uz' => 'Gazli suv', 'name_ru' => 'Газированная вода', 'parent_id' => $top->json('data.id')])
            ->assertCreated()
            ->assertJsonPath('data.parent_id', $top->json('data.id'));
    }

    public function test_parent_from_another_company_is_rejected(): void
    {
        $other = $this->admin('b');
        $foreign = Category::create(['company_id' => $other->company_id, 'name_uz' => 'Begona', 'name_ru' => 'Чужая', 'is_active' => true]);

        Sanctum::actingAs($this->admin('a'));
        $this->postJson('/api/v1/categories', ['name_uz' => 'X', 'name_ru' => 'X', 'parent_id' => $foreign->id])
            ->assertStatus(422)->assertJsonValidationErrors('parent_id');
    }

    public function test_third_level_is_not_allowed(): void
    {
        $admin = $this->admin('a');
        Sanctum::actingAs($admin);
        $top = Category::create(['company_id' => $admin->company_id, 'name_uz' => 'Top', 'name_ru' => 'Top', 'is_active' => true]);
        $sub = Category::create(['company_id' => $admin->company_id, 'parent_id' => $top->id, 'name_uz' => 'Sub', 'name_ru' => 'Sub', 'is_active' => true]);

        $this->postJson('/api/v1/categories', ['name_uz' => 'Chuqur', 'name_ru' => 'Глубоко', 'parent_id' => $sub->id])
            ->assertStatus(422)->assertJsonValidationErrors('parent_id');
    }

    public function test_category_cannot_be_its_own_parent_or_move_under_while_having_children(): void
    {
        $admin = $this->admin('a');
        Sanctum::actingAs($admin);
        $top = Category::create(['company_id' => $admin->company_id, 'name_uz' => 'Top', 'name_ru' => 'Top', 'is_active' => true]);
        $other = Category::create(['company_id' => $admin->company_id, 'name_uz' => 'Boshqa', 'name_ru' => 'Другая', 'is_active' => true]);
        Category::create(['company_id' => $admin->company_id, 'parent_id' => $top->id, 'name_uz' => 'Sub', 'name_ru' => 'Sub', 'is_active' => true]);

        $this->putJson("/api/v1/categories/{$top->id}", ['name_uz' => 'Top', 'name_ru' => 'Top', 'parent_id' => $top->id])
            ->assertStatus(422)->assertJsonValidationErrors('parent_id');

        // Sub-menyusi bor kategoriya boshqasining ichiga kirsa, 3-daraja paydo bo'lardi
        $this->putJson("/api/v1/categories/{$top->id}", ['name_uz' => 'Top', 'name_ru' => 'Top', 'parent_id' => $other->id])
            ->assertStatus(422)->assertJsonValidationErrors('parent_id');
    }

    public function test_filtering_by_top_category_includes_submenu_items_and_per_page_lifts_the_20_limit(): void
    {
        $admin = $this->admin('a');
        Sanctum::actingAs($admin);
        $top = Category::create(['company_id' => $admin->company_id, 'name_uz' => 'Suvlar', 'name_ru' => 'Воды', 'is_active' => true]);
        $gazli = Category::create(['company_id' => $admin->company_id, 'parent_id' => $top->id, 'name_uz' => 'Gazli', 'name_ru' => 'Газ', 'is_active' => true]);
        $gazsiz = Category::create(['company_id' => $admin->company_id, 'parent_id' => $top->id, 'name_uz' => 'Gazsiz', 'name_ru' => 'Без газа', 'is_active' => true]);
        foreach ([$gazli, $gazsiz] as $sub) {
            for ($i = 0; $i < 15; $i++) {
                \App\Models\MenuItem::create(['company_id' => $admin->company_id, 'category_id' => $sub->id, 'name_uz' => "Suv {$sub->id}-{$i}", 'sell_type' => 'portion', 'price' => 5000, 'is_available' => true]);
            }
        }

        $this->getJson("/api/v1/menu-items?category_id={$top->id}&per_page=500")
            ->assertOk()->assertJsonPath('data.total', 30)->assertJsonCount(30, 'data.data');
        $this->getJson("/api/v1/menu-items?category_id={$gazli->id}")
            ->assertOk()->assertJsonPath('data.total', 15);
        $this->getJson('/api/v1/menu-items')->assertOk()->assertJsonPath('data.per_page', 20);
        $this->getJson('/api/v1/menu-items?per_page=100000')->assertOk()->assertJsonPath('data.per_page', 500);
    }
}
