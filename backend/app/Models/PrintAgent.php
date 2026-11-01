<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/** #53: oshxona kompyuteridagi dastur. Kalit faqat xeshi bilan saqlanadi. */
class PrintAgent extends Model
{
    use BelongsToCompany;

    public const ONLINE_SECONDS = 90;

    protected $fillable = ['company_id', 'branch_id', 'name', 'token_hash', 'last_seen_at', 'version', 'alerted_at'];

    protected $hidden = ['token_hash'];

    protected $casts = ['last_seen_at' => 'datetime', 'alerted_at' => 'datetime'];

    protected $appends = ['online'];

    public function getOnlineAttribute(): bool
    {
        return $this->last_seen_at !== null && $this->last_seen_at->gt(now()->subSeconds(self::ONLINE_SECONDS));
    }

    public function company(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
