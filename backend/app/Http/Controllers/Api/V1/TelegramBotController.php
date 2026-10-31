<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\TelegramBot;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** #26: korxona rahbari o'z botini panel orqali ulaydi va boshqaradi. Token javobda qaytmaydi. */
class TelegramBotController extends Controller
{
    use ApiResponse;

    public function __construct(private TelegramBotService $service)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return $this->success($this->present($this->bot($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:100', 'regex:/^\d{5,}:[A-Za-z0-9_-]{30,}$/'],
        ], ['token.regex' => "Token ko'rinishi noto'g'ri. BotFather bergan tokenni to'liq nusxalang (masalan 123456789:AA...)."]);

        $bot = $this->service->connect($request->user()->company, $data['token']);

        return $this->success($this->present($bot));
    }

    public function reconnect(Request $request): JsonResponse
    {
        $bot = $this->bot($request);
        if (! $bot) {
            return $this->error('BOT_NOT_CONNECTED', 'Avval botni ulang.', 404);
        }
        $this->service->configure($bot) && $this->service->check($bot->fresh('company'));

        return $this->success($this->present($bot->fresh()));
    }

    public function destroy(Request $request): JsonResponse
    {
        $bot = $this->bot($request);
        if ($bot) {
            $this->service->disconnect($bot);
        }

        return $this->success(null);
    }

    private function bot(Request $request): ?TelegramBot
    {
        return TelegramBot::with('company')->where('company_id', $request->user()->company_id)->first();
    }

    /** @return array<string, mixed>|null */
    public static function present(?TelegramBot $bot): ?array
    {
        if (! $bot) {
            return null;
        }

        return [
            'username' => $bot->username,
            'name' => $bot->name,
            'status' => $bot->status,
            'last_checked_at' => $bot->last_checked_at?->toIso8601String(),
            'last_error' => $bot->last_error,
            'pending_updates' => $bot->pending_updates,
            'connect_code' => $bot->connect_code,
            'group_title' => $bot->group_title,
            'group_connected' => $bot->group_chat_id !== null,
            'owner_connected' => $bot->owner_chat_id !== null,
            'owner_link' => $bot->username ? "https://t.me/{$bot->username}?start=admin_{$bot->connect_code}" : null,
            'bot_link' => $bot->username ? "https://t.me/{$bot->username}" : null,
        ];
    }
}
