<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\StaffBotSetting;
use App\Models\User;
use App\Services\Telegram\StaffBot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * #37: super admin — platformaning xodimlar botini boshqarish: token, holat,
 * qayta ulash, tasdiqlash kodi, restoranlar bo'yicha ulangan xodimlar.
 */
class StaffBotController extends Controller
{
    use ApiResponse;

    public function __construct(private StaffBot $bot)
    {
    }

    public function show(): JsonResponse
    {
        return $this->success($this->payload());
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:100', 'regex:/^\d{5,}:[A-Za-z0-9_-]{30,}$/'],
        ], ['token.regex' => "Token BotFather bergan ko'rinishda bo'lishi kerak: 123456789:AAH..."]);

        $me = $this->bot->call('getMe', [], $data['token']);
        if (! ($me['ok'] ?? false) || empty($me['result']['is_bot'])) {
            return $this->error('INVALID_TOKEN', "Token noto'g'ri yoki bekor qilingan. BotFather'dan qayta oling.", 422);
        }

        $old = $this->bot->token();
        if ($old && $old !== $data['token'] && $this->bot->source() === 'panel') {
            $this->bot->call('deleteWebhook', [], $old); // eski bot endi xabar olmasin
        }

        $setting = StaffBotSetting::query()->first() ?? new StaffBotSetting;
        $setting->forceFill([
            'token' => $data['token'],
            'username' => $me['result']['username'] ?? null,
            'bot_id' => $me['result']['id'] ?? null,
            'login_code' => $setting->exists ? $setting->login_code : (bool) config('services.telegram.login_code'),
        ])->save();
        $this->bot->forget();

        $steps = $this->bot->setup();
        if (! $steps['setWebhook']['ok']) {
            return $this->error('WEBHOOK_FAILED', "Bot saqlandi, lekin webhook o'rnatilmadi: ".($steps['setWebhook']['error'] ?? '').". «Tekshirish» ni bosing.", 422);
        }

        return $this->success($this->payload());
    }

    public function settings(Request $request): JsonResponse
    {
        $data = $request->validate(['login_code' => 'required|boolean']);

        $setting = StaffBotSetting::query()->first() ?? new StaffBotSetting(['status' => 'disconnected']);
        $setting->forceFill(['login_code' => $data['login_code']])->save();
        $this->bot->forget();

        return $this->success($this->payload());
    }

    public function check(): JsonResponse
    {
        if (! $this->bot->configured()) {
            return $this->error('NOT_CONFIGURED', 'Avval bot tokenini kiriting.', 422);
        }
        $this->bot->check();
        $this->bot->forget();

        return $this->success($this->payload());
    }

    public function destroy(): JsonResponse
    {
        $setting = StaffBotSetting::query()->first();
        if ($setting?->token) {
            $this->bot->call('deleteWebhook', [], $setting->token);
            $setting->forceFill(['token' => null, 'username' => null, 'bot_id' => null, 'status' => 'disconnected', 'last_error' => null])->save();
        }
        $this->bot->forget();

        return $this->success($this->payload());
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $s = $this->bot->setting();
        $username = $this->bot->username();

        $linked = User::withoutGlobalScopes()->whereNotNull('company_id')->where('is_active', true)
            ->select('company_id', DB::raw('COUNT(*) as total'), DB::raw('SUM(CASE WHEN telegram_id IS NOT NULL THEN 1 ELSE 0 END) as linked'))
            ->groupBy('company_id')->get()->keyBy('company_id');

        $companies = Company::orderBy('name')->get(['id', 'name', 'is_active'])->map(fn (Company $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'is_active' => $c->is_active,
            'staff_total' => (int) ($linked[$c->id]->total ?? 0),
            'staff_linked' => (int) ($linked[$c->id]->linked ?? 0),
        ])->sortByDesc('staff_linked')->values();

        return [
            'configured' => $this->bot->configured(),
            'source' => $this->bot->source(),
            'username' => $username,
            'bot_url' => $username ? "https://t.me/{$username}" : null,
            'status' => $this->bot->configured() ? ($s->exists ? $s->status : 'unknown') : 'not_configured',
            'last_error' => $s->last_error,
            'last_checked_at' => $s->last_checked_at?->toIso8601String(),
            'pending_updates' => (int) $s->pending_updates,
            'login_code' => $this->bot->loginCodeEnabled(),
            'webhook_url' => $this->bot->webhookUrl(),
            'mini_app_url' => $this->bot->miniAppUrl(),
            'linked_total' => $companies->sum('staff_linked'),
            'companies' => $companies,
        ];
    }
}
