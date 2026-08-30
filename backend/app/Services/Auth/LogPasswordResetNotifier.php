<?php

namespace App\Services\Auth;

use App\Contracts\PasswordResetNotifier;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Fallback notifier used while no SMS provider is wired up.
 *
 * It records that a code was issued so the event is auditable, but it only
 * writes the code itself when the app runs in debug mode — a production log
 * must never become a password reset oracle.
 */
class LogPasswordResetNotifier implements PasswordResetNotifier
{
    public function send(User $user, string $token, Carbon $expiresAt): void
    {
        Log::warning('Password reset code issued but NOT delivered: no SMS provider is bound.', [
            'user_id' => $user->id,
            'company_id' => $user->company_id,
            'phone' => $user->phone,
            'expires_at' => $expiresAt->toIso8601String(),
            'token' => config('app.debug') ? $token : '[redacted]',
        ]);
    }
}
