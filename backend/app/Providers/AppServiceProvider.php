<?php

namespace App\Providers;

use App\Contracts\PasswordResetNotifier;
use App\Models\User;
use App\Services\Auth\LogPasswordResetNotifier;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Swap this binding for an SMS-backed implementation in production.
        $this->app->bind(PasswordResetNotifier::class, LogPasswordResetNotifier::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // `is_active` used to be checked only at login, so a token issued
        // before a staff member was blocked or dismissed kept working forever.
        // This runs on every Sanctum-authenticated request. The `tokenable`
        // relation is loaded by the guard right after anyway, so this costs no
        // extra query; a soft-deleted user resolves to null and is rejected.
        Sanctum::authenticateAccessTokensUsing(function (PersonalAccessToken $accessToken, bool $isValid): bool {
            if (! $isValid) {
                return false;
            }

            $tokenable = $accessToken->tokenable;

            if ($tokenable instanceof User) {
                return (bool) $tokenable->is_active;
            }

            return $tokenable !== null;
        });
    }
}
