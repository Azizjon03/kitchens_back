<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $branches = Branch::orderBy('name')->get();

        return $this->success($branches);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($limitError = $this->checkBranchLimit($request->user())) {
            return $limitError;
        }

        $branch = Branch::create($data);

        return $this->success($branch, 201);
    }

    /**
     * Enforce the company's plan `max_branches` limit before a new branch is
     * created. Returns a ready-to-send 422 response when the limit is
     * reached, or null when creation may proceed.
     *
     * -1 (or a missing plan/subscription) means "unlimited" - a company with
     * incomplete billing data must never be blocked from managing its own
     * branches. super_admin is exempt (and has no company to limit).
     */
    private function checkBranchLimit(User $user): ?JsonResponse
    {
        if ($user->role === 'super_admin' || ! $user->company_id) {
            return null;
        }

        $plan = $user->company?->subscription?->plan;

        if (! $plan) {
            return null;
        }

        $maxBranches = $plan->max_branches;

        if ($maxBranches === null || $maxBranches === -1) {
            return null;
        }

        $currentBranchCount = Branch::where('company_id', $user->company_id)->count();

        if ($currentBranchCount >= $maxBranches) {
            return $this->error(
                'PLAN_LIMIT_REACHED',
                "Filiallar soni bo'yicha tarif chegarasiga yetdingiz (maksimal: {$maxBranches}).",
                422
            );
        }

        return null;
    }

    public function show(Branch $branch): JsonResponse
    {
        return $this->success($branch->load('users', 'tables'));
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $branch->update($data);

        return $this->success($branch);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $branch->delete();

        return $this->success(null, 204);
    }
}
