<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * #26: restoranning Telegram boti. Token shifrlangan va hech qachon API javobida
 * qaytarilmaydi. Super admin va webhook kontekstida ishlatiladi, shuning uchun
 * CompanyScope yo'q — controllerlar company_id bo'yicha o'zi cheklaydi.
 */
class TelegramBot extends Model
{
    protected $fillable = [
        'company_id', 'token', 'token_hash', 'bot_id', 'username', 'name', 'webhook_secret',
        'status', 'last_checked_at', 'last_error', 'pending_updates', 'connect_code',
        'group_chat_id', 'group_title', 'owner_chat_id', 'alerted_at',
    ];

    protected $hidden = ['token', 'token_hash', 'webhook_secret'];

    protected $casts = [
        'token' => 'encrypted',
        'last_checked_at' => 'datetime',
        'alerted_at' => 'datetime',
        'bot_id' => 'integer',
        'pending_updates' => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function isConnected(): bool
    {
        return $this->status === 'connected';
    }

    public function webhookUrl(): string
    {
        return rtrim((string) config('services.telegram.webhook_base', config('app.url')), '/')
            ."/api/v1/telegram/webhook/{$this->id}";
    }

    public function miniAppUrl(): string
    {
        return rtrim((string) config('services.telegram.frontend_url'), '/').'/tg?company='.$this->company->slug;
    }
}
