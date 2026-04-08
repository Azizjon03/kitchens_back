<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $branches = Branch::orderBy('name')->get();

        return $this->success($branches);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
        ]);

        $branch = Branch::create($data);

        return $this->success($branch, 201);
    }

    public function show(Branch $branch): JsonResponse
    {
        return $this->success($branch->load('users', 'tables'));
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $branch->update($data);

        return $this->success($branch);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $branch->delete();

        return $this->success(null, 204);
    }
}
