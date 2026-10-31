<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** #27: korxona rahbari restoranning ochiq menyu sahifasini (kitchens.uz/r/{slug}) sozlaydi. */
class PublicPageController extends Controller
{
    use ApiResponse;

    public function show(Request $request): JsonResponse
    {
        return $this->success($this->present($request->user()->company));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'description' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:60',
            'address' => 'nullable|string|max:255',
            'opens' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'closes' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'cuisine' => 'nullable|string|max:60',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ], [
            'opens.regex' => 'Vaqtni 09:00 ko\'rinishida yozing.',
            'closes.regex' => 'Vaqtni 23:00 ko\'rinishida yozing.',
        ]);

        /** @var Company $company */
        $company = $request->user()->company;
        $settings = $company->settings_json ?? [];
        $settings['public_page'] = collect($data)->except('address')->all();
        $company->settings_json = $settings;
        if (array_key_exists('address', $data)) {
            $company->address = $data['address'];
        }
        $company->save();

        return $this->success($this->present($company->fresh()));
    }

    /** @return array<string, mixed> */
    private function present(Company $company): array
    {
        return $company->publicPage() + [
            'address' => $company->address,
            'url' => config('seo.site_url').'/r/'.$company->slug,
        ];
    }
}
