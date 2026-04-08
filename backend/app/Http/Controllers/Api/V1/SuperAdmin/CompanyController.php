<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CompanyController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Company::with('subscription.plan');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $companies = $query->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        return $this->success($companies);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100|unique:companies,slug',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'logo' => 'nullable|string|max:500',
            'primary_color' => 'nullable|string|max:20',
        ]);

        $company = Company::create($data);

        // Auto-create Free subscription
        $freePlan = Plan::where('name', 'free')->first();

        if ($freePlan) {
            Subscription::create([
                'company_id' => $company->id,
                'plan_id' => $freePlan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addYear(),
            ]);
        }

        return $this->success($company->load('subscription.plan'), 201);
    }

    public function show(Company $company): JsonResponse
    {
        $company->load('subscription.plan');

        $stats = [
            'users_count' => $company->users()->count(),
            'branches_count' => $company->branches()->count(),
            'orders_count' => $company->orders()->count(),
        ];

        return $this->success([
            'company' => $company,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100|unique:companies,slug,' . $company->id,
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'logo' => 'nullable|string|max:500',
            'primary_color' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'inn' => 'nullable|string|max:50',
            'admin_password' => 'nullable|string|min:8',
        ]);

        $adminPassword = $data['admin_password'] ?? null;
        unset($data['admin_password']);

        $company->update($data);

        if ($adminPassword) {
            $admin = $company->users()->where('role', 'company_admin')->first();
            if ($admin) {
                $admin->update(['password' => Hash::make($adminPassword)]);
            }
        }

        return $this->success($company->fresh()->load('subscription.plan'));
    }

    public function toggle(Company $company): JsonResponse
    {
        $company->update(['is_active' => ! $company->is_active]);

        return $this->success($company->fresh());
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $plan = Plan::findOrFail($data['plan_id']);

        $subscription = $company->subscription;

        if ($subscription) {
            $subscription->update([
                'plan_id' => $plan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
            ]);
        } else {
            Subscription::create([
                'company_id' => $company->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
            ]);
        }

        return $this->success($company->fresh()->load('subscription.plan'));
    }

    public function assignAdmin(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'password' => 'required|string|min:8',
        ]);

        $user = User::where('phone', $data['phone'])->first();

        if ($user) {
            $user->update([
                'company_id' => $company->id,
                'role' => 'company_admin',
                'name' => $data['name'],
            ]);
        } else {
            $user = User::create([
                'company_id' => $company->id,
                'name' => $data['name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'password' => Hash::make($data['password']),
                'role' => 'company_admin',
                'is_active' => true,
            ]);
        }

        return $this->success($user, 201);
    }
}
