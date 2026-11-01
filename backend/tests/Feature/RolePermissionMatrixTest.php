<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Rol × endpoint ruxsatlar matritsasi — routes/api.php dagi `role:` guruhlaridan.
 *
 * Ruxsat bor = javob 403 EMAS (bo'sh body bilan odatda 422 yoki 404 — rol
 * tekshiruvidan o'tdi). Ruxsat yo'q = aniq 403. Yangi route qo'shilsa yoki rol
 * o'zgarsa, shu jadval yangilanadi — aks holda test yiqiladi.
 */
class RolePermissionMatrixTest extends TestCase
{
    use RefreshDatabase;

    private const A = 'company_admin';
    private const M = 'manager';
    private const W = 'waiter';
    private const C = 'chef';
    private const K = 'cashier';
    private const S = 'super_admin';

    /** [usul, yo'l, ruxsat etilgan rollar] */
    public static function endpoints(): array
    {
        $all = [self::A, self::M, self::W, self::C, self::K];

        return [
            'filiallar ro\'yxati' => ['GET', '/branches', $all],
            'filial yaratish' => ['POST', '/branches', [self::A]],
            'xodimlar ro\'yxati' => ['GET', '/users', [self::A]],
            'xodim yaratish' => ['POST', '/users', [self::A]],
            'kategoriyalar' => ['GET', '/categories', [self::A, self::M]],
            'taom yaratish' => ['POST', '/menu-items', [self::A, self::M]],
            'modifikatorlar' => ['GET', '/modifiers', [self::A, self::M]],
            'stollar' => ['GET', '/tables', [self::A, self::M, self::W, self::K]], // kassir ham ofitsiant ekranini ishlatadi
            'stol yaratish' => ['POST', '/tables', [self::A, self::M, self::W]],
            'buyurtmalar ro\'yxati' => ['GET', '/orders', $all],
            'POS menyu' => ['GET', '/pos/menu', [self::A, self::M, self::W, self::K]],
            'buyurtma yaratish' => ['POST', '/orders', [self::A, self::M, self::W, self::K]],
            'to\'lov' => ['POST', '/payments', [self::A, self::M, self::K]],
            'smena ochish' => ['POST', '/cash-shifts/open', [self::A, self::K]],
            'joriy smena' => ['GET', '/cash-shifts/current', [self::A, self::K]],
            'smenalar tarixi' => ['GET', '/cash-shifts', [self::A, self::K]],
            'super: kompaniyalar' => ['GET', '/super/companies', [self::S]],
            'super: dashboard' => ['GET', '/super/dashboard', [self::S]],
            'super: audit log' => ['GET', '/super/audit-logs', [self::S]],
        ];
    }

    private function actingAsRole(string $role): void
    {
        if ($role === self::S) {
            Sanctum::actingAs(User::create([
                'name' => 'Super', 'phone' => '+998906921469', 'role' => self::S,
                'password' => 'secret123', 'is_active' => true,
            ]));

            return;
        }

        $company = Company::create(['name' => 'Rol Co', 'slug' => 'rol-co', 'phone' => '+998700000000', 'is_active' => true]);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'Markaziy', 'is_active' => true]);

        Sanctum::actingAs(User::create([
            'company_id' => $company->id,
            'branch_id' => $role === self::A ? null : $branch->id,
            'name' => $role, 'phone' => '+998900000001', 'role' => $role,
            'password' => 'secret123', 'is_active' => true,
        ]));
    }

    #[DataProvider('endpoints')]
    public function test_role_matrix(string $method, string $path, array $allowed): void
    {
        $failures = [];

        foreach ([self::A, self::M, self::W, self::C, self::K, self::S] as $role) {
            $this->refreshApplication();
            $this->artisan('migrate:fresh');
            $this->actingAsRole($role);

            $status = $this->json($method, '/api/v1'.$path, [])->status();
            $isAllowed = in_array($role, $allowed, true);

            if ($isAllowed && $status === 403) {
                $failures[] = "{$role}: ruxsat bo'lishi kerak edi, 403 qaytdi";
            }
            if (! $isAllowed && $status !== 403) {
                $failures[] = "{$role}: 403 bo'lishi kerak edi, {$status} qaytdi";
            }
        }

        $this->assertSame([], $failures, "{$method} {$path}:\n".implode("\n", $failures));
    }
}
