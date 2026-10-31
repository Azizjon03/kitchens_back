<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * #27: qidiruv tizimlari uchun serverda tayyor sahifalar — landing (uz/ru),
 * restoran menyu sahifasi (schema.org Restaurant + Menu), sitemap.
 */
class SeoPagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['seo.site_url' => 'https://kitchens.uz']);
    }

    private function restaurant(bool $enabled = true): Company
    {
        $company = Company::create([
            'name' => 'Oliyaviy Restoran', 'slug' => 'oliyaviy', 'phone' => '+998902783610', 'address' => "Navoiy ko'chasi 5",
            'is_active' => true,
            'settings_json' => ['public_page' => ['enabled' => $enabled, 'city' => 'Chust', 'opens' => '09:00', 'closes' => '23:00', 'latitude' => 41.0, 'longitude' => 71.24]],
        ]);
        $top = Category::create(['company_id' => $company->id, 'name_uz' => 'Milliy taomlar', 'is_active' => true]);
        $sub = Category::create(['company_id' => $company->id, 'parent_id' => $top->id, 'name_uz' => 'Palov', 'is_active' => true]);
        MenuItem::create(['company_id' => $company->id, 'category_id' => $sub->id, 'name_uz' => "Osh (to'y oshi)", 'sell_type' => 'portion', 'price' => 27000, 'is_available' => true]);
        MenuItem::create(['company_id' => $company->id, 'category_id' => $sub->id, 'name_uz' => 'Choyxona osh', 'sell_type' => 'weight', 'price' => 90000, 'is_available' => true]);
        MenuItem::create(['company_id' => $company->id, 'category_id' => $sub->id, 'name_uz' => 'Tugagan taom', 'sell_type' => 'portion', 'price' => 1000, 'is_available' => false]);

        return $company;
    }

    public function test_landing_is_server_rendered_with_meta_and_schema(): void
    {
        Plan::create(['name' => 'free', 'display_name' => 'Boshlang\'ich', 'price_monthly' => 0, 'max_branches' => 1, 'max_staff' => 5, 'is_active' => true]);
        Plan::create(['name' => 'pro', 'display_name' => 'Pro', 'price_monthly' => 199000, 'max_branches' => 3, 'max_staff' => 30, 'is_active' => true]);
        $this->restaurant();

        $res = $this->get('/')->assertOk()->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $html = $res->getContent();
        $this->assertStringContainsString('<html lang="uz">', $html);
        $this->assertStringContainsString('<title>Kitchens.uz — restoran, kafe va oshxona uchun dastur', $html);
        $this->assertStringContainsString('<meta name="description"', $html);
        $this->assertStringContainsString('rel="alternate" hreflang="ru"', $html);
        $this->assertStringContainsString('property="og:image"', $html);
        $this->assertStringContainsString('"@type":"SoftwareApplication"', $html);
        $this->assertStringContainsString('"@type":"FAQPage"', $html);
        $this->assertStringContainsString('199 000', $html, 'Tariflar bazadan');
        $this->assertStringContainsString('/r/oliyaviy', $html, 'Ochiq restoranlarga ichki havola');

        $ru = $this->get('/ru')->assertOk()->getContent();
        $this->assertStringContainsString('<html lang="ru">', $ru);
        $this->assertStringContainsString('программа для ресторана', $ru);
    }

    public function test_restaurant_page_has_menu_and_restaurant_schema(): void
    {
        $this->restaurant();

        $html = $this->get('/r/oliyaviy')->assertOk()->getContent();

        $this->assertStringContainsString('<title>Oliyaviy Restoran — Chust, menyu va narxlar</title>', $html);
        $this->assertStringContainsString('Palov', $html);
        $this->assertStringContainsString(e("Osh (to'y oshi)"), $html);
        $this->assertStringContainsString("90 000 so'm / kg", $html);
        $this->assertStringNotContainsString('Tugagan taom', $html, 'Mavjud bo\'lmagan taom ko\'rsatilmaydi');
        $this->assertStringContainsString('"@type":"Restaurant"', $html);
        $this->assertStringContainsString('"@type":"MenuItem"', $html);
        $this->assertStringContainsString('"opens":"09:00"', $html);
        $this->assertStringContainsString('"latitude":41', $html);
        $this->assertStringContainsString('rel="canonical" href="https://kitchens.uz/r/oliyaviy"', $html);
    }

    public function test_disabled_or_inactive_restaurant_is_404_and_not_in_sitemap(): void
    {
        $company = $this->restaurant(false);
        $this->get('/r/oliyaviy')->assertNotFound();
        $this->assertStringNotContainsString('/r/oliyaviy', $this->get('/sitemap.xml')->getContent());

        $company->update(['settings_json' => ['public_page' => ['enabled' => true]], 'is_active' => false]);
        $this->get('/r/oliyaviy')->assertNotFound();
    }

    public function test_sitemap_lists_home_and_enabled_restaurants(): void
    {
        $this->restaurant();

        $res = $this->get('/sitemap.xml')->assertOk();
        $this->assertStringContainsString('application/xml', $res->headers->get('Content-Type'));
        $xml = simplexml_load_string($res->getContent());
        $locs = array_map('strval', $xml->xpath('//*[local-name()="loc"]'));
        $this->assertSame(['https://kitchens.uz/', 'https://kitchens.uz/ru', 'https://kitchens.uz/r/oliyaviy'], $locs);
    }

    public function test_menu_change_refreshes_cached_page(): void
    {
        $company = $this->restaurant();
        $this->get('/r/oliyaviy')->assertOk();

        MenuItem::withoutGlobalScopes()->where('name_uz', "Osh (to'y oshi)")->update(['price' => 30000, 'updated_at' => now()->addMinute()]);

        $this->assertStringContainsString("30 000 so'm", $this->get('/r/oliyaviy')->getContent());
    }

    public function test_admin_configures_public_page_and_staff_cannot(): void
    {
        $company = $this->restaurant(false);
        $admin = User::create(['company_id' => $company->id, 'name' => 'Rahbar', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/public-page')->assertOk()
            ->assertJsonPath('data.enabled', false)
            ->assertJsonPath('data.url', 'https://kitchens.uz/r/oliyaviy');

        $this->putJson('/api/v1/public-page', ['enabled' => true, 'opens' => '9:00'])->assertStatus(422)->assertJsonValidationErrors('opens');
        $this->putJson('/api/v1/public-page', [
            'enabled' => true, 'description' => 'Chustdagi eng mazali osh', 'city' => 'Chust', 'address' => 'Markaz', 'opens' => '08:00', 'closes' => '22:00', 'cuisine' => "O'zbek",
        ])->assertOk()->assertJsonPath('data.enabled', true)->assertJsonPath('data.address', 'Markaz');

        $this->assertStringContainsString('Chustdagi eng mazali osh', $this->get('/r/oliyaviy')->assertOk()->getContent());

        $waiter = User::create(['company_id' => $company->id, 'name' => 'O', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);
        Sanctum::actingAs($waiter);
        $this->putJson('/api/v1/public-page', ['enabled' => false])->assertForbidden();
    }
}
