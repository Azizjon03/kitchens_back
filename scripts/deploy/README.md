# Production qo'shimchalari (#26 Telegram bot)

1. **Queue worker** — `kitchens-queue.service` (fayl ichida o'rnatish buyruqlari).
2. **Scheduler** — `deploy` foydalanuvchisi crontab'iga (`crontab -e`):
   ```
   * * * * * cd /var/www/kitchens/backend && php artisan schedule:run >> /dev/null 2>&1
   ```
   `telegram:health` har 5 daqiqada, `telegram:daily-report` har kuni 23:00 da ishlaydi.
3. `.env`: `APP_URL=https://kitchens.uz`, `FRONTEND_URL=https://kitchens.uz`, `QUEUE_CONNECTION=database`.
4. Deploy skriptiga `php artisan queue:restart` qo'shiladi.
