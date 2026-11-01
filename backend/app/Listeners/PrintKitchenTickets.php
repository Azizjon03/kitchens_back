<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Services\Printing\PrintService;

/**
 * #53: yangi buyurtma (yoki menejer tasdiqlagan bot buyurtmasi) — har bo'lim
 * printeriga o'z qog'ozi. Printer xatosi buyurtma oqimini to'xtatmaydi.
 * handle* metodlari Laravel event discovery orqali ulanadi.
 */
class PrintKitchenTickets
{
    public function __construct(private PrintService $print)
    {
    }

    public function handleCreated(OrderCreated $event): void
    {
        if ($event->order->status === 'preparing') {
            $this->safely(fn () => $this->print->kitchenJobs($event->order));
        }
    }

    public function handleStatus(OrderStatusUpdated $event): void
    {
        if ($event->previousStatus === 'pending' && $event->order->status === 'preparing') {
            $this->safely(fn () => $this->print->kitchenJobs($event->order));
        }
    }

    private function safely(callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
