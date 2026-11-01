<?php

namespace App\Http\Middleware;

use App\Models\PrintAgent;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** #53: print agent — X-Agent-Token (faqat xeshi saqlanadi) */
class AuthenticatePrintAgent
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) $request->header('X-Agent-Token');
        $agent = strlen($token) >= 32 ? PrintAgent::withoutGlobalScopes()->where('token_hash', hash('sha256', $token))->first() : null;
        if (! $agent || ! $agent->company()->where('is_active', true)->exists()) {
            return response()->json(['success' => false, 'error' => ['code' => 'INVALID_AGENT', 'message' => 'Agent kaliti noto\'g\'ri yoki bekor qilingan.']], 401);
        }
        $agent->forceFill(['last_seen_at' => now(), 'alerted_at' => null])->saveQuietly();
        $request->attributes->set('print_agent', $agent);

        return $next($request);
    }
}
