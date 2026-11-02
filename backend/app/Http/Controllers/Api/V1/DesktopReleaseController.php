<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\Printing\DesktopRelease;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * #62: Windows ilovasini tarqatish (ochiq). electron-updater `generic` provayderi
 * `GET /desktop/latest.yml` va o'rnatuvchini shu yerdan oladi; panel havolasi — `/desktop/download`.
 */
class DesktopReleaseController extends Controller
{
    use ApiResponse;

    public function info(): JsonResponse
    {
        $latest = DesktopRelease::latest();

        return $this->success($latest ? $latest + ['url' => url('/api/v1/desktop/download')] : null);
    }

    public function download(): RedirectResponse|JsonResponse
    {
        $latest = DesktopRelease::latest();
        if (! $latest) {
            return $this->error('NOT_FOUND', 'Windows ilovasi hali yuklanmagan.', 404);
        }

        return redirect('/api/v1/desktop/'.$latest['file']);
    }

    public function file(string $file): BinaryFileResponse|JsonResponse
    {
        $path = DesktopRelease::dir().'/'.$file;
        if (! preg_match(DesktopRelease::FILE_PATTERN, $file) || ! is_file($path)) {
            return $this->error('NOT_FOUND', 'Fayl topilmadi.', 404);
        }
        if ($file === 'latest.yml') {
            return response()->file($path, ['Content-Type' => 'text/yaml; charset=utf-8', 'Cache-Control' => 'no-cache']);
        }
        // Versiyali fayl o'zgarmaydi — uzoq keshlash mumkin. Range so'rovlari (differensial yangilanish) qo'llab-quvvatlanadi.
        $response = response()->file($path, ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'public, max-age=31536000, immutable']);
        if (str_ends_with($file, '.exe')) {
            $response->setContentDisposition('attachment', $file);
        }

        return $response;
    }
}
