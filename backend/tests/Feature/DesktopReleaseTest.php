<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Services\Printing\DesktopRelease;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** #62: Windows ilovasining o'rnatuvchisi va avtoyangilanish tavsifi serverdan tarqatiladi. */
class DesktopReleaseTest extends TestCase
{
    use RefreshDatabase;

    private string $storage;

    protected function setUp(): void
    {
        parent::setUp();
        $this->storage = sys_get_temp_dir().'/kd-storage-'.uniqid();
        File::ensureDirectoryExists($this->storage.'/app/desktop');
        $this->app->useStoragePath($this->storage);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->storage);
        parent::tearDown();
    }

    private function release(string $version): void
    {
        $dir = DesktopRelease::dir();
        file_put_contents("$dir/Kitchens-Setup-$version.exe", "MZ-installer-$version");
        file_put_contents("$dir/Kitchens-Setup-$version.exe.blockmap", 'blockmap');
        file_put_contents("$dir/latest.yml", "version: $version\nfiles:\n  - url: Kitchens-Setup-$version.exe\n    sha512: abc\n    size: 18\npath: Kitchens-Setup-$version.exe\nsha512: abc\nreleaseDate: '2026-11-02T10:00:00.000Z'\n");
    }

    public function test_nothing_uploaded_yet(): void
    {
        $this->getJson('/api/v1/desktop/info')->assertOk()->assertJsonPath('data', null);
        $this->getJson('/api/v1/desktop/download')->assertNotFound();
        $this->getJson('/api/v1/desktop/latest.yml')->assertNotFound();
    }

    public function test_updater_feed_installer_and_download_link(): void
    {
        $this->release('0.3.0');

        $this->getJson('/api/v1/desktop/info')->assertOk()
            ->assertJsonPath('data.version', '0.3.0')
            ->assertJsonPath('data.file', 'Kitchens-Setup-0.3.0.exe');

        $yml = $this->get('/api/v1/desktop/latest.yml')->assertOk();
        $this->assertStringContainsString('version: 0.3.0', $yml->streamedContent());
        $this->assertStringContainsString('no-cache', $yml->headers->get('Cache-Control'));

        $this->get('/api/v1/desktop/download')->assertRedirect('/api/v1/desktop/Kitchens-Setup-0.3.0.exe');
        $exe = $this->get('/api/v1/desktop/Kitchens-Setup-0.3.0.exe')->assertOk();
        $this->assertSame('MZ-installer-0.3.0', $exe->streamedContent());
        $this->assertStringContainsString('attachment', $exe->headers->get('Content-Disposition'));

        // Differensial yangilanish Range so'rovidan foydalanadi
        $part = $this->withHeaders(['Range' => 'bytes=0-1'])->get('/api/v1/desktop/Kitchens-Setup-0.3.0.exe');
        $part->assertStatus(206);
        $this->assertSame('MZ', $part->streamedContent());

        $this->flushHeaders()->get('/api/v1/desktop/Kitchens-Setup-0.3.0.exe.blockmap')->assertOk();
    }

    public function test_only_release_files_are_served(): void
    {
        $this->release('0.3.0');
        file_put_contents(DesktopRelease::dir().'/secret.txt', 'x');
        $this->getJson('/api/v1/desktop/secret.txt')->assertNotFound();
        $this->getJson('/api/v1/desktop/..%2F..%2F.env')->assertNotFound();
        $this->getJson('/api/v1/desktop/Kitchens-Setup-9.9.9.exe')->assertNotFound();
    }

    public function test_panel_shows_latest_version_and_prune_keeps_three(): void
    {
        foreach (['0.2.0', '0.3.0', '0.4.0', '0.10.0'] as $v) {
            $this->release($v);
        }
        $company = Company::create(['name' => 'Archazor', 'slug' => 'archazor', 'phone' => '+998700000000', 'is_active' => true]);
        Sanctum::actingAs(User::create(['company_id' => $company->id, 'name' => 'Rahbar', 'phone' => '+998900000001', 'role' => 'company_admin', 'password' => 'secret123', 'is_active' => true]));
        $this->getJson('/api/v1/printers')->assertOk()->assertJsonPath('data.latest_desktop_version', '0.10.0');

        $this->artisan('desktop:prune')->assertSuccessful();
        $left = collect(File::files(DesktopRelease::dir()))->map->getFilename()->sort()->values()->all();
        $this->assertSame([
            'Kitchens-Setup-0.10.0.exe', 'Kitchens-Setup-0.10.0.exe.blockmap',
            'Kitchens-Setup-0.3.0.exe', 'Kitchens-Setup-0.3.0.exe.blockmap',
            'Kitchens-Setup-0.4.0.exe', 'Kitchens-Setup-0.4.0.exe.blockmap',
            'latest.yml',
        ], $left);
    }
}
