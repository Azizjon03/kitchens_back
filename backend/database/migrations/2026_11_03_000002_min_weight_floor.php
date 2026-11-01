<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Vazn bilan sotiladigan taomlarda eng kam vazn 0.5 kg (oldin 0.1 bo'lishi mumkin edi). */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['menu_items', 'catalog_items'] as $table) {
            DB::table($table)->where('sell_type', 'weight')
                ->where(fn ($q) => $q->whereNull('min_weight')->orWhere('min_weight', '<', 0.5))
                ->update(['min_weight' => 0.5]);
        }
    }

    public function down(): void
    {
        // Ma'lumot o'zgarishi — qaytarilmaydi
    }
};
