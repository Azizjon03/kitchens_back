<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Modifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModifierController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $modifiers = Modifier::orderBy('name_uz')->get();

        return $this->success($modifiers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name_uz' => 'required|string|max:255',
            'name_ru' => 'required|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $modifier = Modifier::create($data);

        return $this->success($modifier, 201);
    }

    public function show(Modifier $modifier): JsonResponse
    {
        return $this->success($modifier);
    }

    public function update(Request $request, Modifier $modifier): JsonResponse
    {
        $data = $request->validate([
            'name_uz' => 'sometimes|string|max:255',
            'name_ru' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $modifier->update($data);

        return $this->success($modifier->fresh());
    }

    public function destroy(Modifier $modifier): JsonResponse
    {
        $modifier->delete();

        return $this->success(null);
    }
}
