<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Branch;
use Illuminate\Http\Request;

/**
 * Kompaniyada bitta faol filial bo'lsa, branch_id yuborilmaganda o'sha filial olinadi (#21).
 * UI bitta filialda filial maydonini ko'rsatmaydi. Ikki va undan ortiq filialda
 * hech narsa qilinmaydi — validatsiya branch_id ni avvalgidek talab qiladi.
 */
trait DefaultsToSingleBranch
{
    protected function defaultToSingleBranch(Request $request, ?int $companyId): void
    {
        if ($companyId === null || $request->filled('branch_id')) {
            return;
        }

        $ids = Branch::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->limit(2)
            ->pluck('id');

        if ($ids->count() === 1) {
            $request->merge(['branch_id' => $ids->first()]);
        }
    }
}
