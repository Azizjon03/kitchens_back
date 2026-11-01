<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Catalog\CatalogItem;
use App\Models\MenuItem;
use App\Services\Media\ImageStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/** #35: taom rasmlarini yuklash/o'chirish va ommaviy berish. */
class MediaController extends Controller
{
    use \App\Http\Controllers\Api\ApiResponse;

    public function __construct(private ImageStore $images)
    {
    }

    /** Ommaviy — Mini App va restoran sahifasi ko'rsatadi. Fayl nomi uuid, shuning uchun o'zgarmas kesh. */
    public function show(string $path): Response
    {
        $disk = 'media/'.$path;
        abort_unless(Storage::disk('local')->exists($disk), 404);

        return response()->file(Storage::disk('local')->path($disk), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    public function uploadMenuItem(Request $request, MenuItem $menuItem): JsonResponse
    {
        $request->validate(['image' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:6144'], [
            'image.max' => 'Rasm 6 MB dan oshmasin.',
            'image.image' => 'Faqat rasm yuklang (JPG, PNG yoki WEBP).',
            'image.mimes' => 'Faqat JPG, PNG yoki WEBP.',
        ]);
        $old = $menuItem->image;
        $menuItem->update(['image' => $this->images->store($request->file('image'), "menu/{$menuItem->company_id}")]);
        $this->images->delete($old);

        return $this->success($menuItem->fresh()->load('category', 'modifiers', 'addons'));
    }

    public function deleteMenuItem(MenuItem $menuItem): JsonResponse
    {
        $this->images->delete($menuItem->image);
        $menuItem->update(['image' => null]);

        return $this->success($menuItem->fresh()->load('category', 'modifiers', 'addons'));
    }

    public function uploadCatalogItem(Request $request, CatalogItem $item): JsonResponse
    {
        $request->validate(['image' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:6144']);
        $old = $item->image;
        $item->update(['image' => $this->images->store($request->file('image'), 'catalog')]);
        $this->images->delete($old);

        return $this->success($item->fresh());
    }

    public function deleteCatalogItem(CatalogItem $item): JsonResponse
    {
        $this->images->delete($item->image);
        $item->update(['image' => null]);

        return $this->success($item->fresh());
    }
}
