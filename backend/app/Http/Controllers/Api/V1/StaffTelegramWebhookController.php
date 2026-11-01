<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessStaffTelegramUpdate;
use App\Services\Telegram\StaffBot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/** #37: xodimlar boti webhook'i. Sirli kalit tekshiriladi, har update bir marta ishlanadi. */
class StaffTelegramWebhookController extends Controller
{
    public function __invoke(Request $request, StaffBot $bot): JsonResponse
    {
        $secret = (string) $request->header('X-Telegram-Bot-Api-Secret-Token');
        if (! $bot->configured() || ! hash_equals($bot->webhookSecret(), $secret)) {
            return response()->json(['ok' => false], 403);
        }

        $updateId = $request->integer('update_id');
        if ($updateId > 0 && Cache::add("staff-tg-update:{$updateId}", 1, now()->addDay())) {
            ProcessStaffTelegramUpdate::dispatch($request->all());
        }

        return response()->json(['ok' => true]);
    }
}
