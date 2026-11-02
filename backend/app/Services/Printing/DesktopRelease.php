<?php

namespace App\Services\Printing;

use Illuminate\Support\Facades\File;

/**
 * #62: Windows ilovasining o'rnatuvchilari serverda `storage/app/desktop` da turadi
 * (GitHub Actions yuklaydi). `latest.yml` — electron-updater tavsifi (versiya, fayl, sha512).
 */
class DesktopRelease
{
    /** Ruxsat etilgan fayl nomlari: tavsif, o'rnatuvchi va uning blockmap'i. */
    public const FILE_PATTERN = '/^(latest\.yml|Kitchens-Setup-\d+\.\d+\.\d+\.exe(\.blockmap)?)$/';

    public const KEEP = 3;

    public static function dir(): string
    {
        return storage_path('app/desktop');
    }

    /** @return array{version: string, file: string}|null */
    public static function latest(): ?array
    {
        $yml = self::dir().'/latest.yml';
        if (! is_file($yml)) {
            return null;
        }
        $text = (string) file_get_contents($yml);
        if (! preg_match('/^version:\s*[\'"]?([\d.]+)/m', $text, $v) || ! preg_match('/^path:\s*[\'"]?([^\s\'"]+)/m', $text, $p)) {
            return null;
        }
        if (! preg_match(self::FILE_PATTERN, $p[1]) || ! is_file(self::dir().'/'.$p[1])) {
            return null;
        }

        return ['version' => $v[1], 'file' => $p[1]];
    }

    /** Eski o'rnatuvchilarni o'chiradi: oxirgi KEEP ta versiya va joriysi qoladi. */
    public static function prune(): int
    {
        if (! is_dir(self::dir())) {
            return 0;
        }
        $current = self::latest()['version'] ?? null;
        $versions = collect(File::files(self::dir()))
            ->map(fn ($f) => preg_match('/^Kitchens-Setup-(\d+\.\d+\.\d+)\.exe$/', $f->getFilename(), $m) ? $m[1] : null)
            ->filter()->unique()->sort(fn ($a, $b) => version_compare($b, $a))->values();
        $keep = $versions->take(self::KEEP)->push($current)->filter()->all();
        $removed = 0;
        foreach ($versions->diff($keep) as $old) {
            foreach (["Kitchens-Setup-{$old}.exe", "Kitchens-Setup-{$old}.exe.blockmap"] as $name) {
                if (File::delete(self::dir().'/'.$name)) {
                    $removed++;
                }
            }
        }

        return $removed;
    }
}
