<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\TelegramBot;
use Illuminate\Http\JsonResponse;

/** #26: super admin — barcha restoran botlari holati, uzilganlari birinchi. */
class TelegramBotController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $bots = TelegramBot::with('company:id,name,slug')
            ->orderByRaw("CASE WHEN status = 'disconnected' THEN 0 ELSE 1 END")
            ->orderBy('company_id')
            ->get()
            ->map(fn (TelegramBot $b) => [
                'company' => ['id' => $b->company->id, 'name' => $b->company->name],
                'username' => $b->username,
                'status' => $b->status,
                'last_checked_at' => $b->last_checked_at?->toIso8601String(),
                'last_error' => $b->last_error,
                'pending_updates' => $b->pending_updates,
                'group_connected' => $b->group_chat_id !== null,
            ]);

        return $this->success($bots);
    }
}
