<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'logo', 'primary_color', 'phone', 'email',
        'address', 'inn', 'subdomain_enabled', 'is_active', 'settings_json',
    ];

    protected $casts = [
        'subdomain_enabled' => 'boolean',
        'is_active' => 'boolean',
        'settings_json' => 'array',
    ];

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings_json, $key, $default);
    }

    public function getServiceChargePct(): float
    {
        return (float) $this->getSetting('service_charge_pct', 0);
    }

    public function getMaxDiscountPct(): float
    {
        return (float) $this->getSetting('max_discount_pct', 20);
    }

    public function getCancelTimeLimitMinutes(): int
    {
        return (int) $this->getSetting('cancel_time_limit_minutes', 60);
    }
}
