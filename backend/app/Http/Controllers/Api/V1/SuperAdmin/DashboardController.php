<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $companiesByPlan = Plan::withCount(['subscriptions' => function ($q) {
            $q->where('status', 'active');
        }])->get()->map(fn ($plan) => [
            'plan' => $plan->display_name ?? $plan->name,
            'count' => $plan->subscriptions_count,
        ]);

        return $this->success([
            'total_companies' => Company::count(),
            'active_companies' => Company::where('is_active', true)->count(),
            'total_users' => User::count(),
            'total_orders' => Order::count(),
            'total_revenue' => Payment::where('status', 'completed')->sum('amount'),
            'companies_by_plan' => $companiesByPlan,
        ]);
    }
}
