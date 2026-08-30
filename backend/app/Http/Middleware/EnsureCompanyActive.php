<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role === 'super_admin') {
            return $next($request);
        }

        if ($user && $user->company && ! $user->company->is_active) {
            return response()->json(['message' => 'Your company account is deactivated.'], 403);
        }

        // A subscription with no current_period_end (incomplete billing
        // data) or no subscription at all must never block access - only a
        // subscription whose period end is set AND has already passed does.
        // This is deliberately conservative so existing customers are never
        // locked out by a data gap.
        if ($user && $user->company) {
            $subscription = $user->company->subscription;

            if ($subscription && $subscription->current_period_end && $subscription->current_period_end->isPast()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'SUBSCRIPTION_EXPIRED',
                        'message' => 'Your subscription has expired.',
                    ],
                ], 403);
            }
        }

        return $next($request);
    }
}
