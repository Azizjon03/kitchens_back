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
        'name', 'slug', 'logo', 'primary_color', 'phone',
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

    public function telegramBot(): HasOne
    {
        return $this->hasOne(TelegramBot::class);
    }

    /** #26: bot tokeni — panel orqali ulangan bot (eski settings_json zaxira) */
    public function telegramToken(): ?string
    {
        return $this->telegramBot?->token ?: $this->getSetting('telegram_bot_token');
    }

    /**
     * #27: restoranning ochiq (Google'da ko'rinadigan) sahifasi sozlamalari —
     * kitchens.uz/r/{slug}. Rahbar yoqmaguncha sahifa yopiq.
     *
     * @return array{enabled: bool, description: ?string, city: ?string, opens: ?string, closes: ?string, cuisine: ?string, latitude: ?float, longitude: ?float}
     */
    public function publicPage(): array
    {
        $p = (array) $this->getSetting('public_page', []);

        return [
            'enabled' => (bool) ($p['enabled'] ?? false),
            'description' => $p['description'] ?? null,
            'city' => $p['city'] ?? null,
            'opens' => $p['opens'] ?? null,
            'closes' => $p['closes'] ?? null,
            'cuisine' => $p['cuisine'] ?? null,
            'latitude' => isset($p['latitude']) ? (float) $p['latitude'] : null,
            'longitude' => isset($p['longitude']) ? (float) $p['longitude'] : null,
        ];
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
