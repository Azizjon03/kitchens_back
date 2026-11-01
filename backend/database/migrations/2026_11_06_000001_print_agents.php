<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #53: oshxona LAN printerlari. Windows kompyuterdagi dastur (print agent) serverdan
 * vazifalarni oladi va har bo'lim qog'ozini o'z printeriga (ESC/POS, 9100) yuboradi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('printers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('ip', 45);
            $table->unsignedSmallInteger('port')->default(9100);
            $table->unsignedTinyInteger('paper_width')->default(80);
            $table->boolean('is_active')->default(true);
            $table->string('status', 20)->default('unknown'); // online | offline | unknown
            $table->text('last_error')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();
        });

        Schema::table('kitchen_stations', function (Blueprint $table) {
            $table->foreignId('printer_id')->nullable()->constrained()->nullOnDelete();
        });

        Schema::create('print_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('token_hash', 64)->unique();
            $table->timestamp('last_seen_at')->nullable();
            $table->string('version', 20)->nullable();
            $table->timestamp('alerted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('print_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('printer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 20); // kitchen | test
            $table->text('payload'); // ESC/POS, base64
            $table->string('status', 20)->default('pending'); // pending | sent | printed | failed
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('printed_at')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_jobs');
        Schema::dropIfExists('print_agents');
        Schema::table('kitchen_stations', fn (Blueprint $table) => $table->dropConstrainedForeignId('printer_id'));
        Schema::dropIfExists('printers');
    }
};
