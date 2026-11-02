<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PostgreSQL'da `unsignedSmallInteger` oddiy smallint (32767 gacha) bo'ladi, validatsiya esa
 * 65535 gacha ruxsat beradi — 32767 dan katta port 500 xato berardi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $table->integer('port')->default(9100)->change();
        });
    }

    public function down(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $table->unsignedSmallInteger('port')->default(9100)->change();
        });
    }
};
