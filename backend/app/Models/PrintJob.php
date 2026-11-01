<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** #53: printerga yuboriladigan chek (ESC/POS) */
class PrintJob extends Model
{
    use BelongsToCompany;

    protected $fillable = ['company_id', 'branch_id', 'printer_id', 'order_id', 'kind', 'payload', 'status', 'attempts', 'error', 'sent_at', 'printed_at'];

    protected $hidden = ['payload'];

    protected $casts = ['sent_at' => 'datetime', 'printed_at' => 'datetime', 'attempts' => 'integer'];

    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }
}
