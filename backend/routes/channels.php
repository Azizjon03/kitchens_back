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
    if ((int) $user->company_id !== $companyId) {
        return false;
    }

    // company_admin and manager oversee the whole company, so they may
    // listen to any of its branches.
    if (in_array($user->role, ['company_admin', 'manager'], true)) {
        return true;
    }

    // waiter, chef, and cashier are tied to a single branch; a staff member
    // with no branch assigned (nullable users.branch_id) may listen to none.
    if (in_array($user->role, ['waiter', 'chef', 'cashier'], true)) {
        return $user->branch_id !== null && (int) $user->branch_id === $branchId;
    }

    return false;
});
