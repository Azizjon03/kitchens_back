<?php

namespace App\Services\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * #35: taom rasmlari. Yuklangan rasm 900px gacha kichraytiriladi va WebP'ga
 * o'giriladi (GD'da WebP bo'lmasa — PNG). Fayllar storage/app/media da,
 * /api/v1/media/... orqali uzoq kesh bilan beriladi (Cloudflare keshlaydi).
 */
class ImageStore
{
    private const MAX_SIDE = 900;

    /** @return string ommaviy yo'l, masalan /api/v1/media/menu/12/uuid.webp */
    public function store(UploadedFile $file, string $dir): string
    {
        $src = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $src) {
            throw ValidationException::withMessages(['image' => "Rasmni o'qib bo'lmadi. JPG, PNG yoki WEBP yuklang."]);
        }

        [$w, $h] = [imagesx($src), imagesy($src)];
        $scale = min(1, self::MAX_SIDE / max($w, $h));
        $dst = imagecreatetruecolor(max(1, (int) round($w * $scale)), max(1, (int) round($h * $scale)));
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, imagesx($dst), imagesy($dst), $w, $h);

        $webp = function_exists('imagewebp') && (gd_info()['WebP Support'] ?? false);
        ob_start();
        $webp ? imagewebp($dst, null, 80) : imagepng($dst, null, 7);
        $bytes = (string) ob_get_clean();
        imagedestroy($src);
        imagedestroy($dst);

        $path = trim($dir, '/').'/'.Str::uuid().($webp ? '.webp' : '.png');
        Storage::disk('local')->put('media/'.$path, $bytes);

        return '/api/v1/media/'.$path;
    }

    /** Boshqa joyga nusxalash (katalogdan restoran menyusiga) — fayl mustaqil bo'lsin */
    public function copy(string $publicPath, string $dir): ?string
    {
        $from = $this->diskPath($publicPath);
        if (! $from || ! Storage::disk('local')->exists($from)) {
            return null;
        }
        $to = 'media/'.trim($dir, '/').'/'.Str::uuid().'.'.pathinfo($from, PATHINFO_EXTENSION);
        Storage::disk('local')->copy($from, $to);

        return '/api/v1/'.$to;
    }

    public function delete(?string $publicPath): void
    {
        $path = $publicPath ? $this->diskPath($publicPath) : null;
        if ($path) {
            Storage::disk('local')->delete($path);
        }
    }

    /** /api/v1/media/menu/1/x.webp → media/menu/1/x.webp (faqat o'zimizniki) */
    public function diskPath(string $publicPath): ?string
    {
        return preg_match('#^/api/v1/(media/[A-Za-z0-9/_-]+\.(?:webp|png|jpg))$#', $publicPath, $m) ? $m[1] : null;
    }
}
