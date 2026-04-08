<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'display_name', 'price_monthly', 'max_branches', 'max_staff',
        'has_inventory', 'has_full_reports', 'has_branding', 'has_subdomain', 'is_active',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:2',
        'max_branches' => 'integer',
        'max_staff' => 'integer',
        'has_inventory' => 'boolean',
        'has_full_reports' => 'boolean',
        'has_branding' => 'boolean',
        'has_subdomain' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}
