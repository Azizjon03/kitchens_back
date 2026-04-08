<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with(['user:id,name,email', 'company:id,name'])
            ->orderByDesc('created_at');

        if ($companyId = $request->query('company_id')) {
            $query->where('company_id', $companyId);
        }

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        if ($model = $request->query('model')) {
            $query->where('model', $model);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('model', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $logs = $query->paginate($request->integer('per_page', 20));

        return $this->success($logs);
    }
}
