<?php

namespace App\Http\Controllers\Api\V1\Tg;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    use ApiResponse;

    /**
     * Company branding + active branches + available menu for the Mini App.
     */
    public function index(Request $request, MenuService $menuService): JsonResponse
    {
        $company = $request->attributes->get('tg_company');

        $branches = Branch::where('company_id', $company->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'address']);

        return $this->success([
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'logo' => $company->logo,
                'primary_color' => $company->primary_color,
            ],
            'branches' => $branches,
            'menu' => $menuService->forCompany($company->id),
        ]);
    }
}
