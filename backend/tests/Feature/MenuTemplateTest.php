<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #23: kompaniya ochishda restoran turi bo'yicha standart menyu global katalogdan
 * nusxalanadi (kategoriya → sub-menyu → taom, osh qo'shimchalari).
 */
class MenuTemplateTest extends TestCase
{
    use RefreshDatabase;

    private function createCompany(?string $template): Company
    {
        Plan::firstOrCreate(['name' => 'free'], ['display_name' => 'Free', 'price_monthly' => 0, 'max_branches' => 1, 'max_staff' => 5, 'is_active' => true]);
        Sanctum::actingAs(User::firstOrCreate(['phone' => '+998906921469'], [
            'name' => 'Super', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true,
        ]));

        $slug = 'r-'.($template ?? 'none').'-'.random_int(100, 999);
        $payload = [
            'name' => 'Restoran', 'slug' => $slug, 'phone' => '+998700000001',
            'owner_full_name' => 'Ega', 'owner_phone' => '+99890'.random_int(1000000, 9999999), 'owner_password' => 'secret123',
        ];
        if ($template !== null) {
            $payload['menu_template'] = $template;
        }
        $this->postJson('/api/v1/super/companies', $payload)->assertCreated();

        return Company::where('slug', $slug)->firstOrFail();
    }

    private function topNames(Company $company): array
    {
        return Category::withoutGlobalScopes()->where('company_id', $company->id)->whereNull('parent_id')
            ->orderBy('sort_order')->pluck('name_uz')->all();
    }

    public function test_oshxona_gets_national_menu_with_submenus_and_no_fast_food(): void
    {
        $company = $this->createCompany('oshxona');

        $this->assertSame(['Milliy taomlar', 'Salatlar', 'Non va shirinliklar', 'Suvlar', 'Ichimliklar'], $this->topNames($company));

        $palov = Category::withoutGlobalScopes()->where('company_id', $company->id)->where('name_uz', 'Palov')->firstOrFail();
        $this->assertNotNull($palov->parent_id, 'Palov — Milliy taomlar ichidagi sub-menyu');

        $choyxona = MenuItem::withoutGlobalScopes()->where('company_id', $company->id)->where('name_uz', 'Choyxona osh (kg)')->firstOrFail();
        $this->assertSame('weight', $choyxona->sell_type);
        $this->assertEquals(0.5, (float) $choyxona->min_weight);
        $this->assertEquals(90000, (float) $choyxona->price);

        // Taomlar faqat sub-menyularda
        $topIds = Category::withoutGlobalScopes()->where('company_id', $company->id)->whereNull('parent_id')->pluck('id');
        $this->assertSame(0, MenuItem::withoutGlobalScopes()->whereIn('category_id', $topIds)->count());
    }

    public function test_osh_addons_are_attached_to_every_palov_item(): void
    {
        $company = $this->createCompany('oshxona');

        $this->assertSame(6, Addon::withoutGlobalScopes()->where('company_id', $company->id)->count());

        $palov = Category::withoutGlobalScopes()->where('company_id', $company->id)->where('name_uz', 'Palov')->firstOrFail();
        $items = MenuItem::withoutGlobalScopes()->where('category_id', $palov->id)->with(['addons' => fn ($q) => $q->withoutGlobalScopes()])->get();
        $this->assertGreaterThan(0, $items->count());
        foreach ($items as $item) {
            $this->assertCount(6, $item->addons, "{$item->name_uz} — 6 ta qo'shimcha");
            $this->assertTrue($item->addons->every(fn ($a) => $a->company_id === $company->id));
        }

        $somsa = MenuItem::withoutGlobalScopes()->where('company_id', $company->id)->where('name_uz', 'Tandir somsa')->firstOrFail();
        $this->assertCount(0, $somsa->addons()->withoutGlobalScopes()->get());
    }

    public function test_fast_food_and_kafe_get_their_own_sections(): void
    {
        $fast = $this->createCompany('fast_food');
        $this->assertSame(['Salatlar', 'Fast food', 'Suvlar', 'Ichimliklar'], $this->topNames($fast));
        $this->assertSame(0, Addon::withoutGlobalScopes()->where('company_id', $fast->id)->count(), 'Palov yo\'q — osh qo\'shimchalari ham yo\'q');

        $kafe = $this->createCompany('kafe');
        $this->assertSame(['Non va shirinliklar', 'Kafe', 'Suvlar', 'Ichimliklar'], $this->topNames($kafe));
    }

    public function test_hammasi_gets_everything_and_bosh_gets_nothing(): void
    {
        $all = $this->createCompany('hammasi');
        $this->assertCount(7, $this->topNames($all));
        $this->assertSame(182, MenuItem::withoutGlobalScopes()->where('company_id', $all->id)->count());

        $empty = $this->createCompany('bosh');
        $this->assertSame([], $this->topNames($empty));

        // Tur yuborilmasa — bo'sh (eski API mijozlari uchun)
        $legacy = $this->createCompany(null);
        $this->assertSame([], $this->topNames($legacy));
    }

    public function test_unknown_template_is_rejected(): void
    {
        Plan::firstOrCreate(['name' => 'free'], ['display_name' => 'Free', 'price_monthly' => 0, 'max_branches' => 1, 'max_staff' => 5, 'is_active' => true]);
        Sanctum::actingAs(User::create(['name' => 'S', 'phone' => '+998906921469', 'role' => 'super_admin', 'password' => 'secret123', 'is_active' => true]));

        $this->postJson('/api/v1/super/companies', [
            'name' => 'X', 'slug' => 'x', 'phone' => '+998700000001', 'menu_template' => 'pizzeria',
            'owner_full_name' => 'E', 'owner_phone' => '+998901112233', 'owner_password' => 'secret123',
        ])->assertStatus(422)->assertJsonValidationErrors('menu_template');
    }
}
