<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Concerns\DefaultsToSingleBranch;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PrintAgent;
use App\Models\PrintJob;
use App\Models\Printer;
use App\Services\KitchenService;
use App\Services\Printing\EscPos;
use App\Services\Printing\PrintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * #53: oshxona printerlari, kompyuterlar (print agent) va chek vazifalari.
 */
class PrinterController extends Controller
{
    use ApiResponse, DefaultsToSingleBranch;

    public const AGENT_VERSION = '1.2.0';

    public function index(): JsonResponse
    {
        return $this->success([
            'printers' => Printer::orderBy('name')->get(),
            'agents' => PrintAgent::orderBy('id')->get(),
            'latest_agent_version' => self::AGENT_VERSION,
            'recent_jobs' => PrintJob::with('printer:id,name')->latest('id')->limit(15)
                ->get(['id', 'printer_id', 'order_id', 'kind', 'status', 'error', 'attempts', 'created_at', 'printed_at']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $this->defaultToSingleBranch($request, $companyId);

        return $this->success(Printer::create($this->validated($request, $companyId)), 201);
    }

    public function update(Request $request, Printer $printer): JsonResponse
    {
        $printer->update($this->validated($request, $printer->company_id, $printer));

        return $this->success($printer->fresh());
    }

    public function destroy(Printer $printer): JsonResponse
    {
        $printer->delete(); // bo'limlardagi bog'lanish null bo'ladi

        return $this->success(null);
    }

    public function test(Printer $printer, PrintService $print): JsonResponse
    {
        if (! PrintAgent::where('branch_id', $printer->branch_id)->exists()) {
            return $this->error('NO_AGENT', "Avval oshxona kompyuterini ulang — chekni u printerga yuboradi.", 422);
        }

        return $this->success($print->testJob($printer), 201);
    }

    /** Kompyuterni ulash: kalit faqat shu javobda ko'rinadi va dastur fayliga yoziladi */
    public function storeAgent(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $this->defaultToSingleBranch($request, $companyId);
        $data = $request->validate([
            'name' => 'required|string|max:60',
            'branch_id' => ['required', Rule::exists('branches', 'id')->where('company_id', $companyId)],
        ]);
        $token = Str::random(48);
        $agent = PrintAgent::create($data + ['token_hash' => hash('sha256', $token)]);
        $company = $request->user()->company;

        $script = strtr((string) file_get_contents(resource_path('print-agent/kitchens-printer.ps1')), [
            '__SERVER__' => rtrim((string) config('app.url'), '/'),
            '__TOKEN__' => $token,
            '__VERSION__' => self::AGENT_VERSION,
            // Windows PowerShell 5.1 BOM'siz faylni ANSI deb o'qiydi — faqat ASCII
            '__COMPANY__' => str_replace(["\r", "\n"], ' ', EscPos::ascii((string) $company?->name)),
            '__AGENT__' => str_replace(["\r", "\n", "'", '"', '`', '$'], ' ', EscPos::ascii($agent->name)),
        ]);

        return $this->success(['agent' => $agent, 'script' => $script, 'filename' => 'kitchens-printer.ps1'], 201);
    }

    public function destroyAgent(PrintAgent $printAgent): JsonResponse
    {
        $printAgent->delete(); // kalit darhol bekor bo'ladi

        return $this->success(null);
    }

    /** Oshxona ekranidan qayta chop etish (oshpaz — o'z bo'limlari) */
    public function printKitchen(Request $request, Order $order, PrintService $print, KitchenService $kitchen): JsonResponse
    {
        $data = $request->validate(['station_id' => 'nullable|integer']);
        $mine = $kitchen->stationsOf($request->user());
        $stations = isset($data['station_id']) ? [(int) $data['station_id']] : $mine;
        if ($mine !== null && $stations !== null && array_diff($stations, $mine)) {
            return $this->error('FORBIDDEN', "Bu bo'lim sizga biriktirilmagan.", 403);
        }
        $jobs = $print->kitchenJobs($order, $stations);
        if ($jobs->isEmpty()) {
            return $this->error('NO_PRINTER', "Bu bo'limga printer biriktirilmagan.", 422);
        }

        return $this->success(['jobs' => $jobs->count()], 201);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?int $companyId, ?Printer $printer = null): array
    {
        return $request->validate([
            'name' => [$printer ? 'sometimes' : 'required', 'string', 'max:60'],
            'ip' => [$printer ? 'sometimes' : 'required', 'ipv4'],
            'port' => 'sometimes|integer|min:1|max:65535',
            'paper_width' => ['sometimes', Rule::in([58, 80])],
            'is_active' => 'sometimes|boolean',
            'branch_id' => [$printer ? 'prohibited' : 'required', Rule::exists('branches', 'id')->where('company_id', $companyId)],
        ], ['ip.ipv4' => "IP manzil 192.168.1.100 ko'rinishida bo'lishi kerak."]);
    }
}
