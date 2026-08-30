<?php

namespace App\Contracts;

use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Delivery point for password reset codes.
 *
 * This is the ONLY seam between the reset flow and the outside world. To ship
 * real SMS delivery, write an implementation and rebind it in
 * `AppServiceProvider::register()` — nothing in `AuthController` changes.
 */
interface PasswordResetNotifier
{
    /**
     * Deliver a freshly issued reset code to the user.
     *
     * @param  string  $token  Plaintext code — never persist or log it in production.
     */
    public function send(User $user, string $token, Carbon $expiresAt): void;
}
