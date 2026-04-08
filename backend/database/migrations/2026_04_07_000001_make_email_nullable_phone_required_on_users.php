<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fill null phone values with a placeholder based on user id
        DB::table('users')->whereNull('phone')->orWhere('phone', '')->update([
            'phone' => DB::raw("'+998' || LPAD(id::text, 9, '0')"),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('phone', 20)->nullable(false)->change();
        });

        // Drop old unique index and create new one on phone
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'email']);
            $table->unique(['company_id', 'phone']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'phone']);
            $table->unique(['company_id', 'email']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
            $table->string('phone', 20)->nullable()->change();
        });
    }
};
