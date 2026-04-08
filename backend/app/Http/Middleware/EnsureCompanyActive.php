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

        if ($user && $user->company && !$user->company->is_active) {
            return response()->json(['message' => 'Your company account is deactivated.'], 403);
        }

        return $next($request);
    }
}
