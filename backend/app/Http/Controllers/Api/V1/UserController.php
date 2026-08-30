<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

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
        $authUser = $request->user();
        $companyId = $authUser->company_id;

        $this->normalizePhoneInput($request);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => [
                'required', 'string', 'max:20',
                Rule::unique('users', 'phone')->where(fn ($q) => $q->where('company_id', $companyId)),
            ],
            'email' => 'nullable|email|max:255',
            'role' => ['required', Rule::in(self::STAFF_ROLES)],
            'branch_id' => ['nullable', $this->existsInCompany('branches', $companyId)],
            'password' => 'required|string|min:8',
            'is_active' => 'boolean',
        ]);

        if ($limitError = $this->checkStaffLimit($authUser)) {
            return $limitError;
        }

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

        $this->normalizePhoneInput($request);

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
            'branch_id' => ['nullable', $this->existsInCompany('branches', $companyId)],
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

    /**
     * A Rule::exists() scoped to the given company, so a raw `exists:` check
     * (which bypasses the CompanyScope global scope) can never validate an
     * id that belongs to another tenant. When $companyId is null (only
     * possible for a super_admin, who has no company and legitimately works
     * cross-tenant) the check is left unscoped rather than forced to match
     * nothing.
     */
    private function existsInCompany(string $table, ?int $companyId): Exists
    {
        return Rule::exists($table, 'id')->where(function ($query) use ($companyId) {
            if ($companyId !== null) {
                $query->where('company_id', $companyId);
            }
        });
    }

    /**
     * Enforce the company's plan `max_staff` limit before a new staff
     * account is created. Returns a ready-to-send 422 response when the
     * limit is reached, or null when creation may proceed.
     *
     * -1 (or a missing plan/subscription) means "unlimited" - a company
     * with incomplete billing data must never be blocked from managing its
     * own staff. super_admin is exempt (and has no company to limit).
     */
    private function checkStaffLimit(User $requestingUser): ?JsonResponse
    {
        if ($requestingUser->role === 'super_admin' || ! $requestingUser->company_id) {
            return null;
        }

        $plan = $requestingUser->company?->subscription?->plan;

        if (! $plan) {
            return null;
        }

        $maxStaff = $plan->max_staff;

        if ($maxStaff === null || $maxStaff === -1) {
            return null;
        }

        $currentStaffCount = User::where('company_id', $requestingUser->company_id)
            ->whereIn('role', self::STAFF_ROLES)
            ->count();

        if ($currentStaffCount >= $maxStaff) {
            return $this->error(
                'PLAN_LIMIT_REACHED',
                "Xodimlar soni bo'yicha tarif chegarasiga yetdingiz (maksimal: {$maxStaff}).",
                422
            );
        }

        return null;
    }

    private function normalizePhone(string $phone): string
    {
        return User::normalizePhone($phone);
    }

    /**
     * Normalize the submitted phone before validation runs, so the
     * per-company uniqueness rule compares the same string that will be
     * written to the DB (otherwise "+998 90 111 22 33" would pass the rule
     * and then hit the unique index as a 500).
     */
    private function normalizePhoneInput(Request $request): void
    {
        if ($request->has('phone') && is_string($request->input('phone'))) {
            $request->merge(['phone' => User::normalizePhone($request->input('phone'))]);
        }
    }
}
