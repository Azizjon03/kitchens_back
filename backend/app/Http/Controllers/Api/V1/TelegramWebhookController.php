<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessTelegramUpdate;
use App\Models\TelegramBot;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * #26: Telegram webhook. Sirli kalit (X-Telegram-Bot-Api-Secret-Token) tekshiriladi;
 * har update bir marta ishlanadi (update_id bo'yicha) — Telegram qayta yuborsa ham.
 */
class TelegramWebhookController extends Controller
{
    public function __invoke(Request $request, int $bot): JsonResponse
    {
        $model = TelegramBot::find($bot);
        $secret = (string) $request->header('X-Telegram-Bot-Api-Secret-Token');
        if (! $model || ! hash_equals($model->webhook_secret, $secret)) {
            return response()->json(['ok' => false], 403);
        }

        $updateId = $request->integer('update_id');
        if ($updateId <= 0) {
            return response()->json(['ok' => true]);
        }

        try {
            DB::table('telegram_updates')->insert([
                'telegram_bot_id' => $model->id, 'update_id' => $updateId, 'created_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException) {
            return response()->json(['ok' => true]); // takroriy — allaqachon navbatda
        }

        ProcessTelegramUpdate::dispatch($model->id, $request->all());

        return response()->json(['ok' => true]);
    }
}
