<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Email tizimda ishlatilmaydi: login, parol tiklash va bildirishnomalar telefon
 * orqali (password_reset_codes). Ustunlar va Laravel'ning email asosidagi
 * password_reset_tokens jadvali olib tashlanadi.
 *
 * Production'da o'chirilgan ma'lumot (2026-10-31): faqat super admin'ning seeder
 * qiymati admin@kitchens.uz; kompaniyalarda email yo'q edi. Deploydan oldin zaxira.
 */
return new class extends Migration
{
    public function up(): void
    {
        // (company_id, email) unique indeksi 2026_04_07 migratsiyasida (company_id, phone) ga almashtirilgan
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email', 'email_verified_at']);
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('email');
        });

        Schema::dropIfExists('password_reset_tokens');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->after('name');
            $table->timestamp('email_verified_at')->nullable()->after('email');
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->string('email')->nullable()->after('phone');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }
};
