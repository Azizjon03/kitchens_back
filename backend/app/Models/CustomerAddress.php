<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** #39: mijozning saqlangan manzili — «Uy», «Ish» yoki boshqa nom. */
class CustomerAddress extends Model
{
    protected $fillable = ['customer_id', 'label', 'address', 'latitude', 'longitude', 'last_used_at'];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'last_used_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
