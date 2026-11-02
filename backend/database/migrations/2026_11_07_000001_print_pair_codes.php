<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #59: Windows ilovasini panelga 6 raqamli bir martalik kod bilan ulash.
 * Kodning o'zi saqlanmaydi, faqat xeshi; 10 daqiqa amal qiladi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_pair_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('code_hash', 64)->index();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('print_agent_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('print_agents', function (Blueprint $table) {
            $table->string('client', 20)->nullable(); // desktop | powershell
        });
    }

    public function down(): void
    {
        Schema::table('print_agents', fn (Blueprint $table) => $table->dropColumn('client'));
        Schema::dropIfExists('print_pair_codes');
    }
};
