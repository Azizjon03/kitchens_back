<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;

class MenuService
{
    /**
     * Active categories with their available menu items (incl. modifiers and
     * add-ons) for a company. Global scopes are bypassed and the company is
     * filtered explicitly so this works for both authenticated staff (POS) and
     * unauthenticated Telegram customers.
     */
    public function forCompany(int $companyId): Collection
    {
        return Category::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->with(['menuItems' => function ($query) use ($companyId) {
                $query->withoutGlobalScopes()
                    ->where('company_id', $companyId)
                    ->where('is_available', true)
                    ->with(['modifiers', 'addons'])
                    ->orderBy('sort_order');
            }])
            ->orderBy('sort_order')
            ->get();
    }
}
