<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Addon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddonController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $addons = Addon::orderBy('name_uz')->get();

        return $this->success($addons);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name_uz' => 'required|string|max:255',
            'name_ru' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $addon = Addon::create($data);

        return $this->success($addon, 201);
    }

    public function show(Addon $addon): JsonResponse
    {
        return $this->success($addon);
    }

    public function update(Request $request, Addon $addon): JsonResponse
    {
        $data = $request->validate([
            'name_uz' => 'sometimes|string|max:255',
            'name_ru' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $addon->update($data);

        return $this->success($addon->fresh());
    }

    public function destroy(Addon $addon): JsonResponse
    {
        $addon->delete();

        return $this->success(null);
    }
}
