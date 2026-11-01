<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\KitchenStation;
use App\Models\MenuItem;
use App\Models\PrintJob;
use App\Models\Printer;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** #53: oshxona LAN printerlari — har bo'limga o'z qog'ozi, agent API, ogohlantirish. */
class PrintAgentTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private User $admin;
    private User $waiter;
    private Printer $kabobPrinter;
    private Printer $oshPrinter;
    private MenuItem $kabob;
    private MenuItem $osh;
    private Addon $meat;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake(fn (HttpRequest $r) => Http::response(['ok' => true, 'result' => ['message_id' => 1]]));
        $this->company = Company::create(['name' => 'Archazor', 'slug' => 'archazor', 'phone' => '+998700000000', 'is_active' => true, 'settings_json' => ['service_charge_pct' => 0]]);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'name' => 'Asosiy filial', 'is_active' => true]);
        $this->admin = User::create(['company_id' => $this->company->id, 'name' => 'Rahbar', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]);
        $this->waiter = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'Dilshod', 'phone' => '+998900000002', 'role' => 'waiter', 'password' => 'secret123', 'is_active' => true]);

        Sanctum::actingAs($this->admin);
        $this->kabobPrinter = Printer::find($this->postJson('/api/v1/printers', ['name' => 'Kabob printer', 'ip' => '192.168.1.51', 'paper_width' => 80])->assertCreated()->json('data.id'));
        $this->oshPrinter = Printer::find($this->postJson('/api/v1/printers', ['name' => 'Osh printer', 'ip' => '192.168.1.52', 'paper_width' => 58])->assertCreated()->json('data.id'));

        $kabobCat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Shashliklar', 'is_active' => true]);
        $oshCat = Category::create(['company_id' => $this->company->id, 'name_uz' => 'Taomlar', 'is_active' => true]);
        $this->postJson('/api/v1/kitchen-stations', ['name' => 'Kabob', 'category_ids' => [$kabobCat->id], 'printer_id' => $this->kabobPrinter->id])->assertCreated();
        $this->postJson('/api/v1/kitchen-stations', ['name' => 'Oshxona ichi', 'category_ids' => [$oshCat->id], 'printer_id' => $this->oshPrinter->id])->assertCreated();
        $this->kabob = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $kabobCat->id, 'name_uz' => "Mol to'rg'amchi", 'price' => 24000, 'is_available' => true]);
        $this->osh = MenuItem::create(['company_id' => $this->company->id, 'category_id' => $oshCat->id, 'name_uz' => 'Osh (1 kg)', 'price' => 45000, 'is_available' => true]);
        $this->meat = Addon::create(['company_id' => $this->company->id, 'name_uz' => "Go'sht", 'price' => 12000, 'is_active' => true, 'max_quantity' => 3]);
        $this->osh->addons()->attach($this->meat->id);
    }

    private function agent(): string
    {
        Sanctum::actingAs($this->admin);
        $res = $this->postJson('/api/v1/print-agents', ['name' => 'Oshxona kompyuteri'])->assertCreated();
        $script = $res->json('data.script');
        preg_match("/\\\$Token\s+=\s+'([^']+)'/", $script, $m);
        $this->assertStringContainsString("\$Server  = 'http", $script);
        $this->assertStringNotContainsString('__TOKEN__', $script);
        // Windows PowerShell 5.1: BOM'siz UTF-8 ni ANSI deb o'qiydi — "—" qo'shtirnoqqa aylanib skript buziladi
        $this->assertDoesNotMatchRegularExpression('/[^\x00-\x7F]/', $script, 'Agent skripti faqat ASCII bo\'lishi kerak');

        return $m[1];
    }

    private function order(): int
    {
        $table = Table::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'number' => "So'ri 3", 'seats' => 8, 'status' => 'free']);
        Sanctum::actingAs($this->waiter);

        return $this->postJson('/api/v1/orders', ['type' => 'dine_in', 'branch_id' => $this->branch->id, 'table_id' => $table->id, 'items' => [
            ['menu_item_id' => $this->kabob->id, 'quantity' => 4],
            ['menu_item_id' => $this->osh->id, 'quantity' => 1, 'addons' => [['id' => $this->meat->id, 'quantity' => 2]], 'note' => 'achchiq qilmang'],
        ]])->assertCreated()->json('data.id');
    }

    public function test_new_order_creates_one_ticket_per_station_printer_with_own_items(): void
    {
        $id = $this->order();
        $jobs = PrintJob::withoutGlobalScopes()->where('order_id', $id)->get()->keyBy('printer_id');
        $this->assertCount(2, $jobs);

        $kabob = base64_decode($jobs[$this->kabobPrinter->id]->payload);
        $this->assertStringStartsWith("\x1B@", $kabob);
        $this->assertStringContainsString('KABOB', $kabob);
        $this->assertStringContainsString("STOL So'ri 3", $kabob);
        $this->assertStringContainsString("4 x Mol to'rg'amchi", $kabob);
        $this->assertStringNotContainsString('Osh (1 kg)', $kabob);
        $this->assertStringNotContainsString('24000', $kabob);
        $this->assertStringContainsString("Boshqa bo'limlar: Oshxona ichi", $kabob);
        $this->assertStringContainsString("\x1DV", $kabob); // kesish

        $osh = base64_decode($jobs[$this->oshPrinter->id]->payload);
        $this->assertStringContainsString("+ GO'SHT x2", $osh);
        $this->assertStringContainsString('Izoh: achchiq qilmang', $osh);
        $this->assertDoesNotMatchRegularExpression('/[^\x00-\x7F]/', $osh); // faqat ASCII
    }

    public function test_agent_fetches_jobs_reports_results_and_retries_failures(): void
    {
        $token = $this->agent();
        $this->order();
        $this->withHeaders(['X-Agent-Token' => 'wrong-token-wrong-token-wrong-token'])->getJson('/api/v1/agent/jobs')->assertStatus(401);

        $h = ['X-Agent-Token' => $token];
        $beat = $this->withHeaders($h)->postJson('/api/v1/agent/heartbeat', ['version' => '1.0.0', 'printers' => [['id' => $this->kabobPrinter->id, 'online' => true]]])->assertOk();
        $this->assertCount(2, $beat->json('data.printers'));
        $this->assertSame('online', $this->kabobPrinter->fresh()->status);

        $jobs = $this->withHeaders($h)->getJson('/api/v1/agent/jobs')->assertOk()->json('data');
        $this->assertCount(2, $jobs);
        $this->assertSame('192.168.1.51', collect($jobs)->firstWhere('printer.id', $this->kabobPrinter->id)['printer']['ip']);
        $this->assertCount(0, $this->withHeaders($h)->getJson('/api/v1/agent/jobs')->json('data')); // ikkinchi marta berilmaydi

        $ok = collect($jobs)->firstWhere('printer.id', $this->kabobPrinter->id)['id'];
        $bad = collect($jobs)->firstWhere('printer.id', $this->oshPrinter->id)['id'];
        $this->withHeaders($h)->postJson("/api/v1/agent/jobs/{$ok}", ['ok' => true])->assertOk();
        $this->assertSame('printed', PrintJob::find($ok)->status);

        // Xato — qayta urinish, 3-chisidan keyin «failed» va rahbarga xabar
        config(['services.telegram.staff_token' => '777:t']);
        $this->admin->forceFill(['telegram_id' => '4242'])->save();
        $this->withHeaders($h)->postJson("/api/v1/agent/jobs/{$bad}", ['ok' => false, 'error' => 'Printer javob bermadi'])->assertOk();
        $this->assertSame('pending', PrintJob::find($bad)->status);
        foreach ([2, 3] as $_) {
            $this->withHeaders($h)->getJson('/api/v1/agent/jobs')->assertOk();
            $this->withHeaders($h)->postJson("/api/v1/agent/jobs/{$bad}", ['ok' => false, 'error' => 'Printer javob bermadi'])->assertOk();
        }
        $this->assertSame('failed', PrintJob::find($bad)->status);
        $this->assertSame('offline', $this->oshPrinter->fresh()->status);
        $sent = collect(Http::recorded())->map(fn ($p) => $p[0]->data())->firstWhere('chat_id', '4242');
        $this->assertStringContainsString("qog'ozi chiqmadi", $sent['text']);
    }

    public function test_pending_bot_order_prints_only_after_confirm(): void
    {
        config(['app.debug' => true]);
        \App\Models\Customer::create(['telegram_id' => '777', 'name' => 'Vali', 'phone' => '+998901234567', 'latitude' => 40.99, 'longitude' => 71.23, 'registered_at' => now()]);
        $this->app['auth']->forgetGuards();
        $id = $this->withHeaders(['X-Telegram-Dev-Id' => '777'])->postJson('/api/v1/tg/orders?company=archazor', [
            'branch_id' => $this->branch->id, 'type' => 'delivery', 'items' => [['menu_item_id' => $this->kabob->id, 'quantity' => 2]],
        ])->assertCreated()->assertJsonPath('data.status', 'pending')->json('data.id');
        $this->assertSame(0, PrintJob::withoutGlobalScopes()->where('order_id', $id)->count());

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/v1/orders/{$id}/confirm")->assertOk();
        $this->assertSame([$this->kabobPrinter->id], PrintJob::withoutGlobalScopes()->where('order_id', $id)->pluck('printer_id')->all());
    }

    public function test_kds_reprint_one_station(): void
    {
        $this->agent();
        $id = $this->order();
        PrintJob::query()->delete();

        // Oshxona ekranidan qayta chop etish — faqat bitta bo'lim
        $chef = User::create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id, 'name' => 'Oshpaz', 'phone' => '+998900000003', 'role' => 'chef', 'password' => 'secret123', 'is_active' => true]);
        $station = KitchenStation::where('name', 'Kabob')->first();
        Sanctum::actingAs($chef);
        $this->postJson("/api/v1/orders/{$id}/print-kitchen", ['station_id' => $station->id])->assertCreated()->assertJsonPath('data.jobs', 1);
        $this->assertSame($this->kabobPrinter->id, PrintJob::withoutGlobalScopes()->first()->printer_id);
    }

    public function test_test_print_requires_agent_and_health_alerts_once_when_agent_down(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/printers/{$this->kabobPrinter->id}/test")->assertStatus(422)->assertJsonPath('error.code', 'NO_AGENT');
        $this->agent();
        $this->postJson("/api/v1/printers/{$this->kabobPrinter->id}/test")->assertCreated();
        $this->postJson('/api/v1/printers', ['name' => 'X', 'ip' => '999.1.1.1'])->assertStatus(422);

        config(['services.telegram.staff_token' => '777:t']);
        $this->admin->forceFill(['telegram_id' => '4242'])->save();
        PrintJob::query()->update(['created_at' => now()->subMinutes(5)]);
        \App\Models\PrintAgent::query()->update(['last_seen_at' => now()->subMinutes(10)]);
        Artisan::call('print:health');
        Artisan::call('print:health');
        $alerts = collect(Http::recorded())->map(fn ($p) => $p[0]->data())->where('chat_id', '4242')
            ->filter(fn ($d) => str_contains($d['text'], 'aloqada emas'));
        $this->assertCount(1, $alerts);

        // Ofitsiant printerlarni boshqara olmaydi; boshqa kompaniya ko'rmaydi
        Sanctum::actingAs($this->waiter);
        $this->getJson('/api/v1/printers')->assertForbidden();
    }
}
