<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'company_id', 'branch_id', 'name', 'phone', 'role',
        'password', 'avatar', 'is_active', 'invite_token', 'invited_at',
    ];

    protected $hidden = [
        'password', 'remember_token', 'invite_token', 'telegram_id',
    ];

    /** #37: panelga faqat "ulangan/ulanmagan" ko'rinadi, Telegram ID emas */
    protected $appends = ['telegram_linked'];

    public function getTelegramLinkedAttribute(): bool
    {
        return $this->telegram_id !== null;
    }

    protected function casts(): array
    {
        return [
            'invited_at' => 'datetime',
            'telegram_linked_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /** #40: oshpaz biriktirilgan oshxona bo'limlari (bo'sh — hammasini ko'radi) */
    public function kitchenStations(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(KitchenStation::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Canonical storage form for a phone number: a leading "+" and digits only.
     *
     * Shared by AuthController and UserController so the value written to the
     * DB and the value checked for uniqueness can never drift apart.
     */
    public static function normalizePhone(string $phone): string
    {
        return \App\Support\Phone::normalize($phone); // #42: 9 raqam → +998
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isCompanyAdmin(): bool
    {
        return $this->role === 'company_admin';
    }

    public function hasRole(string|array $roles): bool
    {
        return in_array($this->role, (array) $roles);
    }

    public function canManageCompany(): bool
    {
        return $this->hasRole(['super_admin', 'company_admin']);
    }

    public function canCancelOrder(): bool
    {
        return $this->hasRole(['company_admin', 'manager']);
    }

    public function canProcessPayment(): bool
    {
        return $this->hasRole(['company_admin', 'manager', 'cashier']);
    }
}
