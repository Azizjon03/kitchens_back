<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * #21: filiali yo'q kompaniyalarga "Asosiy filial" qo'shiladi (yangi kompaniyalar
 * endi u bilan yaratiladi). Filialsiz ofitsiant/oshpaz/kassirlar unga biriktiriladi —
 * ular KDS kanalini filial bo'yicha tinglaydi.
 */
return new class extends Migration
{
    public function up(): void
    {
        $companies = DB::table('companies')
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('branches')->whereColumn('branches.company_id', 'companies.id'))
            ->get(['id', 'phone']);

        foreach ($companies as $company) {
            $branchId = DB::table('branches')->insertGetId([
                'company_id' => $company->id,
                'name' => 'Asosiy filial',
                'phone' => $company->phone,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('users')
                ->where('company_id', $company->id)
                ->whereNull('branch_id')
                ->whereIn('role', ['waiter', 'chef', 'cashier'])
                ->update(['branch_id' => $branchId, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        // Ma'lumot migratsiyasi: qaysi filial avtomatik qo'shilganini ajratib bo'lmaydi — qaytarilmaydi.
    }
};
