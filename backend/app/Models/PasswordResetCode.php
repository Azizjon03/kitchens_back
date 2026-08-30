<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single-use, time-limited password reset code bound to one user.
 *
 * Deliberately NOT company-scoped: the forgot-password flow runs
 * unauthenticated, so there is no tenant to scope to.
 */
class PasswordResetCode extends Model
{
    protected $fillable = [
        'user_id', 'phone', 'token_hash', 'attempts', 'expires_at',
    ];

    protected $hidden = [
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
