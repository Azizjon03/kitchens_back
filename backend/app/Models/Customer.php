<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'telegram_id', 'name', 'phone', 'latitude', 'longitude', 'address', 'registered_at',
    ];

    protected $casts = [
        'registered_at' => 'datetime',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    /** #26: telefon, F.I.SH va joylashuv berilgan — buyurtma tugmasi ochiladi */
    public function isRegistered(): bool
    {
        return $this->registered_at !== null;
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(CustomerFavorite::class);
    }

    public function loyaltyAccounts(): HasMany
    {
        return $this->hasMany(LoyaltyAccount::class);
    }
}
