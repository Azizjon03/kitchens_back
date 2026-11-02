<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\PrintAgent;
use App\Models\PrintJob;
use App\Models\PrintPairCode;
use App\Models\Printer;
use App\Services\Printing\PrintAlerts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * #53: oshxona kompyuteridagi dastur uchun API (X-Agent-Token).
 * Dastur har 2 soniyada vazifalarni oladi, printerga yuboradi va natijani aytadi.
 */
class PrintAgentApiController extends Controller
{
    use ApiResponse;

    private const MAX_ATTEMPTS = 3;

    /**
     * #59: Windows ilovasi panelda olingan 6 raqamli kod bilan ulanadi va agent kalitini oladi.
     * Kalitsiz (ochiq) marshrut — IP bo'yicha throttle; kod bir marta va 10 daqiqa amal qiladi.
     */
    public function pair(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
            'version' => 'nullable|string|max:20',
        ]);

        $result = DB::transaction(function () use ($data) {
            $pair = PrintPairCode::withoutGlobalScopes()->where('code_hash', PrintPairCode::hash($data['code']))
                ->whereNull('used_at')->where('expires_at', '>', now())->lockForUpdate()->first();
            $company = $pair ? Company::where('is_active', true)->find($pair->company_id) : null;
            if (! $pair || ! $company) {
                return null;
            }

            $token = Str::random(48);
            $agent = PrintAgent::withoutGlobalScopes()->create([
                'company_id' => $pair->company_id,
                'branch_id' => $pair->branch_id,
                'name' => $pair->name,
                'token_hash' => hash('sha256', $token),
                'version' => $data['version'] ?? null,
                'client' => 'desktop',
                'last_seen_at' => now(),
            ]);
            $pair->forceFill(['used_at' => now(), 'print_agent_id' => $agent->id])->save();

            return ['token' => $token, 'agent' => ['id' => $agent->id, 'name' => $agent->name], 'company' => ['name' => $company->name]];
        });

        if (! $result) {
            return $this->error('INVALID_PAIR_CODE', "Kod noto'g'ri yoki muddati o'tgan. Panelda yangi kod oling.", 422);
        }

        return $this->success($result, 201);
    }

    /** Ishga tushganda va har 30 soniyada: printerlar ro'yxati va holati */
    public function heartbeat(Request $request): JsonResponse
    {
        $agent = $request->attributes->get('print_agent');
        $data = $request->validate([
            'version' => 'nullable|string|max:20',
            'client' => 'nullable|in:desktop,powershell',
            'printers' => 'nullable|array|max:50',
            'printers.*.id' => 'required|integer',
            'printers.*.online' => 'required|boolean',
            'printers.*.error' => 'nullable|string|max:300',
        ]);
        if (isset($data['version'])) {
            $agent->forceFill(['version' => $data['version'], 'client' => $data['client'] ?? 'powershell'])->saveQuietly();
        }
        foreach ($data['printers'] ?? [] as $p) {
            Printer::withoutGlobalScopes()->where('branch_id', $agent->branch_id)->whereKey($p['id'])->update([
                'status' => $p['online'] ? 'online' : 'offline',
                'last_error' => $p['online'] ? null : ($p['error'] ?? 'Javob bermadi'),
                'last_checked_at' => now(),
            ]);
        }

        return $this->success([
            'agent' => ['id' => $agent->id, 'name' => $agent->name],
            'printers' => Printer::withoutGlobalScopes()->where('branch_id', $agent->branch_id)->where('is_active', true)
                ->get(['id', 'name', 'ip', 'port', 'paper_width']),
        ]);
    }

    /** Yangi vazifalar (va javobi kelmay qolganlari — 60 soniyadan keyin qayta) */
    public function jobs(Request $request): JsonResponse
    {
        $agent = $request->attributes->get('print_agent');
        $jobs = DB::transaction(function () use ($agent) {
            $jobs = PrintJob::withoutGlobalScopes()->with('printer:id,ip,port,name')
                ->where('branch_id', $agent->branch_id)
                ->where(fn ($q) => $q->where('status', 'pending')
                    ->orWhere(fn ($q) => $q->where('status', 'sent')->where('sent_at', '<', now()->subSeconds(60))))
                ->where('attempts', '<', self::MAX_ATTEMPTS)
                ->orderBy('id')->limit(20)->lockForUpdate()->get();
            foreach ($jobs as $job) {
                $job->forceFill(['status' => 'sent', 'sent_at' => now(), 'attempts' => $job->attempts + 1])->save();
            }

            return $jobs;
        });

        return $this->success($jobs->map(fn (PrintJob $j) => [
            'id' => $j->id,
            'kind' => $j->kind,
            'printer' => ['id' => $j->printer->id, 'name' => $j->printer->name, 'ip' => $j->printer->ip, 'port' => $j->printer->port],
            'data' => $j->payload, // base64 ESC/POS
        ])->values());
    }

    public function report(Request $request, int $job, PrintAlerts $alerts): JsonResponse
    {
        $agent = $request->attributes->get('print_agent');
        $data = $request->validate(['ok' => 'required|boolean', 'error' => 'nullable|string|max:500']);
        $model = PrintJob::withoutGlobalScopes()->where('branch_id', $agent->branch_id)->findOrFail($job);

        if ($data['ok']) {
            $model->forceFill(['status' => 'printed', 'printed_at' => now(), 'error' => null])->save();
            Printer::withoutGlobalScopes()->whereKey($model->printer_id)->update(['status' => 'online', 'last_error' => null, 'last_checked_at' => now()]);
        } else {
            $final = $model->attempts >= self::MAX_ATTEMPTS;
            $model->forceFill(['status' => $final ? 'failed' : 'pending', 'error' => $data['error'] ?? 'Xato'])->save();
            Printer::withoutGlobalScopes()->whereKey($model->printer_id)->update(['status' => 'offline', 'last_error' => $data['error'] ?? 'Xato', 'last_checked_at' => now()]);
            if ($final) {
                $alerts->jobFailed($model->fresh('printer'));
            }
        }

        return $this->success(null);
    }
}
