<?php

namespace App\Http\Controllers\Api\V1\SuperAdmin;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\MenuTemplate\MenuTemplateService;
use App\Models\Company;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CompanyController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Company::with('subscription.plan');

        if ($search = trim((string) $request->query('search'))) {
            // LOWER(): PostgreSQL'da LIKE katta-kichik harfga sezgir ("oliy" "Oliyaviy"ni topmasdi)
            $needle = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
            $query->where(function ($q) use ($needle) {
                $q->whereRaw('LOWER(name) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$needle]);
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        // id — barqaror tartib: bir soniyada yaratilganlar sahifalar orasida takrorlanmaydi
        $companies = $query->orderByDesc('created_at')->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return $this->success($companies);
    }

    public function store(Request $request, MenuTemplateService $menuTemplates): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100|unique:companies,slug',
            'phone' => 'required|string|max:20',
            'logo' => 'nullable|string|max:500',
            'primary_color' => 'nullable|string|max:20',
            // Kompaniya egasi (company_admin) — usiz kompaniyaga hech kim kira olmaydi
            'owner_full_name' => 'required|string|max:255',
            'owner_phone' => ['required', 'string', 'max:30', 'regex:/^\+?[\d\s()\-]{9,30}$/', $this->notSuperAdminPhone()],
            'owner_password' => 'required|string|min:8',
            // Standart menyu turi (#23); yuborilmasa — bo'sh menyu (eski API mijozlari)
            'menu_template' => ['nullable', 'string', \Illuminate\Validation\Rule::in(MenuTemplateService::TYPES)],
        ]);
        $menuTemplate = $data['menu_template'] ?? 'bosh';
        unset($data['menu_template']);

        $owner = [
            'name' => $data['owner_full_name'],
            'phone' => User::normalizePhone($data['owner_phone']),
            'password' => $data['owner_password'],
        ];
        unset($data['owner_full_name'], $data['owner_phone'], $data['owner_password']);

        // Kompaniya, obuna va admin birga yaratiladi: biri yiqilsa, hech biri qolmaydi
        $company = DB::transaction(function () use ($data, $owner, $menuTemplate, $menuTemplates) {
            $company = Company::create($data);

            // Auto-create Free subscription
            $freePlan = Plan::where('name', 'free')->first();

            if ($freePlan) {
                Subscription::create([
                    'company_id' => $company->id,
                    'plan_id' => $freePlan->id,
                    'status' => 'active',
                    'current_period_start' => now(),
                    'current_period_end' => now()->addYear(),
                ]);
            }

            // Stol, buyurtma, kassa filialsiz ishlamaydi — bitta joyli restoran uchun
            // filial avtomatik; UI bitta filialda filial maydonini ko'rsatmaydi (#21)
            Branch::create([
                'company_id' => $company->id,
                'name' => 'Asosiy filial',
                'phone' => $company->phone,
                'is_active' => true,
            ]);

            // Restoran turi bo'yicha standart menyu — global katalogdan nusxa (#23)
            $menuTemplates->apply($company, $menuTemplate);

            User::create($owner + [
                'company_id' => $company->id,
                'role' => 'company_admin',
                'is_active' => true,
            ]);

            return $company;
        });

        return $this->success($company->load('subscription.plan'), 201);
    }

    public function show(Company $company): JsonResponse
    {
        $company->load('subscription.plan');

        $stats = [
            'users_count' => $company->users()->count(),
            'branches_count' => $company->branches()->count(),
            'orders_count' => $company->orders()->count(),
        ];

        return $this->success([
            'company' => $company,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100|unique:companies,slug,' . $company->id,
            'phone' => 'sometimes|required|string|max:20',
            'logo' => 'nullable|string|max:500',
            'primary_color' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'inn' => 'nullable|string|max:50',
            'admin_password' => 'nullable|string|min:8',
        ]);

        $adminPassword = $data['admin_password'] ?? null;
        unset($data['admin_password']);

        $company->update($data);

        if ($adminPassword) {
            $admin = $company->users()->where('role', 'company_admin')->first();
            if ($admin) {
                $admin->update(['password' => Hash::make($adminPassword)]);
            }
        }

        return $this->success($company->fresh()->load('subscription.plan'));
    }

    public function toggle(Company $company): JsonResponse
    {
        $company->update(['is_active' => ! $company->is_active]);

        return $this->success($company->fresh());
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $plan = Plan::findOrFail($data['plan_id']);

        $subscription = $company->subscription;

        if ($subscription) {
            $subscription->update([
                'plan_id' => $plan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
            ]);
        } else {
            Subscription::create([
                'company_id' => $company->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
            ]);
        }

        return $this->success($company->fresh()->load('subscription.plan'));
    }

    public function assignAdmin(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[\d\s()\-]{9,30}$/', $this->notSuperAdminPhone()],
            'password' => 'required|string|min:8',
        ]);

        $phone = User::normalizePhone($data['phone']);

        // Faqat SHU kompaniya ichida qidiriladi: users unique (company_id, phone),
        // telefon global emas. Global qidiruv boshqa tenantning foydalanuvchisini
        // (yoki super adminni) shu kompaniyaga ko'chirib yuborardi.
        $user = User::where('company_id', $company->id)->where('phone', $phone)->first();

        if ($user) {
            $user->update([
                'role' => 'company_admin',
                'name' => $data['name'],
                'password' => $data['password'],
                'is_active' => true,
            ]);
        } else {
            $user = User::create([
                'company_id' => $company->id,
                'name' => $data['name'],
                'phone' => $phone,
                'password' => $data['password'],
                'role' => 'company_admin',
                'is_active' => true,
            ]);
        }

        return $this->success($user, 201);
    }

    /**
     * Super admin telefoni kompaniya foydalanuvchisiga berilmaydi: bir xil parol
     * bilan login ikki ma'noli bo'lib (409), super admin panelga kira olmay qolardi.
     */
    private function notSuperAdminPhone(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $exists = User::where('role', 'super_admin')
                ->where('phone', User::normalizePhone((string) $value))
                ->exists();

            if ($exists) {
                $fail('Bu telefon raqam tizim administratoriga tegishli.');
            }
        };
    }
}
