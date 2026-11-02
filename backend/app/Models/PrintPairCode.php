<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/** #59: Windows ilovasini ulash uchun bir martalik kod (faqat xeshi saqlanadi). */
class PrintPairCode extends Model
{
    use BelongsToCompany;

    public const TTL_MINUTES = 10;

    protected $fillable = ['company_id', 'branch_id', 'name', 'code_hash', 'expires_at', 'used_at', 'print_agent_id'];

    protected $hidden = ['code_hash'];

    protected $casts = ['expires_at' => 'datetime', 'used_at' => 'datetime'];

    public static function hash(string $code): string
    {
        return hash('sha256', 'kitchens-pair:'.$code);
    }
}
