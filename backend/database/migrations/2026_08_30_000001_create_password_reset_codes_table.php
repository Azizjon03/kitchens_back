<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phone-based password reset codes.
 *
 * The framework's `password_reset_tokens` table is keyed by `email`, but this
 * application logs in by phone and most staff accounts have `email = null`,
 * so that table cannot carry the flow. It is intentionally left in place
 * (untouched, with its data) for any future email-based broker usage.
 *
 * A row is bound to a single `user_id` because `phone` is only unique per
 * company (`users.unique(company_id, phone)`) — the same number may belong to
 * staff in several companies, and the code itself is what disambiguates them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Normalized phone the code was sent to (denormalized for lookup
            // without joining users, and kept even if the user changes phone).
            $table->string('phone', 20);
            // HMAC-SHA256 of the code — the plaintext code never touches the DB.
            $table->string('token_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['phone', 'expires_at']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_codes');
    }
};
