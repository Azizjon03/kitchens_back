<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #49: zallar (stol guruhlari). Zal «butun zalga buyurtma» ga ruxsat bersa, uning
 * o'z «butun zal» stoli bo'ladi (is_whole_group). Eski «zona» matnlari zallarga o'tadi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->boolean('allow_whole')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['branch_id', 'name']);
        });

        Schema::table('tables', function (Blueprint $table) {
            $table->foreignId('table_group_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_whole_group')->default(false);
        });

        // Eski zonalar → zallar
        $zones = DB::table('tables')->whereNotNull('zone')->where('zone', '!=', '')
            ->select('company_id', 'branch_id', 'zone')->distinct()->get();
        foreach ($zones as $i => $z) {
            $id = DB::table('table_groups')->insertGetId([
                'company_id' => $z->company_id, 'branch_id' => $z->branch_id, 'name' => mb_substr($z->zone, 0, 60),
                'allow_whole' => false, 'sort_order' => $i + 1, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('tables')->where('branch_id', $z->branch_id)->where('zone', $z->zone)->update(['table_group_id' => $id]);
        }
    }

    public function down(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->dropConstrainedForeignId('table_group_id');
            $table->dropColumn('is_whole_group');
        });
        Schema::dropIfExists('table_groups');
    }
};
