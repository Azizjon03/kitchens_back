<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Private channel used by the kitchen display (KDS) and the waiter screen.
| A user may only listen to their own company's branch channel.
|
*/

Broadcast::channel('kitchen.{companyId}.{branchId}', function (User $user, int $companyId, int $branchId) {
    return (int) $user->company_id === $companyId
        && in_array($user->role, ['company_admin', 'manager', 'waiter', 'chef'], true);
});
