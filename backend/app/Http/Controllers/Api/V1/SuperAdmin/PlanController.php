<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(Plan::orderBy('price_monthly')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:50|unique:plans,name',
            'display_name' => 'required|string|max:100',
            'price_monthly' => 'required|numeric|min:0',
            'max_branches' => 'required|integer|min:-1',
            'max_staff' => 'required|integer|min:-1',
            'has_inventory' => 'boolean',
            'has_full_reports' => 'boolean',
            'has_branding' => 'boolean',
            'has_subdomain' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $plan = Plan::create($data);

        return $this->success($plan, 201);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:50|unique:plans,name,' . $plan->id,
            'display_name' => 'sometimes|string|max:100',
            'price_monthly' => 'sometimes|numeric|min:0',
            'max_branches' => 'sometimes|integer|min:-1',
            'max_staff' => 'sometimes|integer|min:-1',
            'has_inventory' => 'boolean',
            'has_full_reports' => 'boolean',
            'has_branding' => 'boolean',
            'has_subdomain' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $plan->update($data);

        return $this->success($plan->fresh());
    }
}
