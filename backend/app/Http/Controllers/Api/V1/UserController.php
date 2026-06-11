<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Roles a company_admin is allowed to create/manage.
     */
    private const STAFF_ROLES = ['manager', 'waiter', 'chef', 'cashier'];

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $query = User::with('branch')
            ->where('company_id', $companyId)
            ->whereIn('role', self::STAFF_ROLES);

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20));

        return $this->success($users);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => [
                'required', 'string', 'max:20',
                Rule::unique('users', 'phone')->where(fn ($q) => $q->where('company_id', $companyId)),
            ],
            'email' => 'nullable|email|max:255',
            'role' => ['required', Rule::in(self::STAFF_ROLES)],
            'branch_id' => 'nullable|exists:branches,id',
            'password' => 'required|string|min:8',
            'is_active' => 'boolean',
        ]);

        $phone = $this->normalizePhone($data['phone']);

        $user = User::create([
            'company_id' => $companyId,
            'branch_id' => $data['branch_id'] ?? null,
            'name' => $data['name'],
            'phone' => $phone,
            'email' => $data['email'] ?? null,
            'role' => $data['role'],
            'password' => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? true,
        ]);

        return $this->success($user->load('branch'), 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeSameCompany($request, $user);

        return $this->success($user->load('branch'));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeSameCompany($request, $user);

        $companyId = $request->user()->company_id;

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => [
                'sometimes', 'string', 'max:20',
                Rule::unique('users', 'phone')
                    ->where(fn ($q) => $q->where('company_id', $companyId))
                    ->ignore($user->id),
            ],
            'email' => 'nullable|email|max:255',
            'role' => ['sometimes', Rule::in(self::STAFF_ROLES)],
            'branch_id' => 'nullable|exists:branches,id',
            'password' => 'nullable|string|min:8',
            'is_active' => 'boolean',
        ]);

        if (! empty($data['phone'])) {
            $data['phone'] = $this->normalizePhone($data['phone']);
        }

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return $this->success($user->fresh()->load('branch'));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeSameCompany($request, $user);

        $user->delete();

        return $this->success(null);
    }

    private function authorizeSameCompany(Request $request, User $user): void
    {
        abort_unless(
            $user->company_id === $request->user()->company_id
                && in_array($user->role, self::STAFF_ROLES, true),
            404
        );
    }

    private function normalizePhone(string $phone): string
    {
        return '+' . preg_replace('/\D/', '', $phone);
    }
}
