<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * #37: platformaning xodimlar boti sozlamasi (bitta qator). Super admin panelidan
 * boshqariladi; token shifrlangan va API javobida hech qachon qaytarilmaydi.
 */
class StaffBotSetting extends Model
{
    protected $fillable = [
        'token', 'username', 'bot_id', 'status', 'last_error', 'last_checked_at', 'pending_updates', 'login_code',
    ];

    protected $hidden = ['token'];

    protected $casts = [
        'token' => 'encrypted',
        'bot_id' => 'integer',
        'pending_updates' => 'integer',
        'login_code' => 'boolean',
        'last_checked_at' => 'datetime',
    ];

    public static function current(): self
    {
        return static::query()->first() ?? new static(['status' => 'disconnected', 'login_code' => false]);
    }
}
