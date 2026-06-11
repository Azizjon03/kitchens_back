<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Models\Customer;
use App\Services\Telegram\InitDataValidator;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ValidateTelegramInitData
{
    public function __construct(private InitDataValidator $validator)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $slug = $request->input('company') ?? $request->query('company');

        if (! $slug) {
            return response()->json(['success' => false, 'error' => [
                'code' => 'COMPANY_REQUIRED', 'message' => 'Company slug is required.',
            ]], 422);
        }

        $company = Company::where('slug', $slug)->first();

        if (! $company || ! $company->is_active) {
            return response()->json(['success' => false, 'error' => [
                'code' => 'COMPANY_NOT_FOUND', 'message' => 'Company not found or inactive.',
            ]], 404);
        }

        $telegramId = null;
        $name = null;
        $phone = null;

        // Dev-only bypass so the Mini App can be tested without a real bot.
        $devId = $request->header('X-Telegram-Dev-Id');
        if (config('app.debug') && $devId) {
            $telegramId = $devId;
            $name = $request->header('X-Telegram-Dev-Name', 'Test mijoz');
        } else {
            $botToken = $company->getSetting('telegram_bot_token');

            if (! $botToken) {
                return response()->json(['success' => false, 'error' => [
                    'code' => 'BOT_NOT_CONFIGURED', 'message' => 'Telegram bot is not configured for this company.',
                ]], 422);
            }

            $initData = $request->header('X-Telegram-Init-Data') ?? $request->input('init_data');

            if (! $initData) {
                return response()->json(['success' => false, 'error' => [
                    'code' => 'INIT_DATA_REQUIRED', 'message' => 'Telegram init data is required.',
                ]], 401);
            }

            $data = $this->validator->validate($initData, $botToken);

            if (! $data || empty($data['user']['id'])) {
                return response()->json(['success' => false, 'error' => [
                    'code' => 'INVALID_INIT_DATA', 'message' => 'Telegram init data is invalid.',
                ]], 401);
            }

            $telegramId = (string) $data['user']['id'];
            $name = trim(($data['user']['first_name'] ?? '').' '.($data['user']['last_name'] ?? '')) ?: 'Mijoz';
        }

        $customer = Customer::firstOrCreate(
            ['telegram_id' => $telegramId],
            ['name' => $name, 'phone' => $phone],
        );

        DB::table('customer_companies')->updateOrInsert(
            ['customer_id' => $customer->id, 'company_id' => $company->id],
            ['updated_at' => now(), 'created_at' => now()],
        );

        $request->attributes->set('tg_company', $company);
        $request->attributes->set('tg_customer', $customer);

        return $next($request);
    }
}
