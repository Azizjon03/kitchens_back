<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fill null/empty phone values with a placeholder based on user id.
        // Done in PHP so it works across drivers (Postgres in prod, SQLite in tests).
        $ids = DB::table('users')
            ->whereNull('phone')
            ->orWhere('phone', '')
            ->pluck('id');

        foreach ($ids as $id) {
            DB::table('users')->where('id', $id)->update([
                'phone' => '+998'.str_pad((string) $id, 9, '0', STR_PAD_LEFT),
            ]);
        }

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
