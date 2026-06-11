# Phase 1 — Sozlash yo'riqnomasi

Phase 1 da qo'shilgan modullar: **Xodimlar boshqaruvi, Oshxona (KDS, real-time
WebSocket), Ofitsiant ekrani, Telegram mijoz Mini App, naqd/karta to'lov cheklovi.**

Quyidagi qadamlar **Docker ichida** bajariladi (mahalliy PHP/Composer talab qilinmaydi).

## 1. Backend bog'liqliklar va migratsiya

```bash
docker compose up -d
docker compose exec app composer require laravel/reverb   # composer.json'da bor, install qiladi
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed                # plans + super admin
```

## 2. `.env` (backend/.env)

`.env.example` dan ko'chiring va Reverb + Frontend qiymatlarini tekshiring:

```
BROADCAST_CONNECTION=reverb
FRONTEND_URL=http://localhost:3000

REVERB_APP_ID=kitchens
REVERB_APP_KEY=kitchens-key
REVERB_APP_SECRET=kitchens-secret
REVERB_HOST=reverb          # Docker xizmat nomi (mahalliy uchun: localhost)
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
```

`php artisan key:generate` ni unutmang.

## 3. Reverb (WebSocket) serveri

`docker-compose.yml` ga `reverb` xizmati qo'shilgan (port **8080**). U avtomatik
`php artisan reverb:start` ni ishga tushiradi. Qayta ishga tushirish:

```bash
docker compose up -d reverb
docker compose logs -f reverb
```

## 4. Frontend (frontend/.env)

```
VITE_REVERB_APP_KEY=kitchens-key
VITE_REVERB_HOST=localhost   # brauzer Reverb'ga shu manzilda ulanadi
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

## 5. Rollar va sahifalar

| Rol | Sahifalar |
|-----|-----------|
| company_admin | Menyu, Qo'shimchalar, Stollar, Ofitsiant, Buyurtmalar, Oshxona, Kassa, Xodimlar, Filiallar |
| manager | Menyu, Stollar, Ofitsiant, Buyurtmalar, Oshxona |
| waiter | Stollar, Ofitsiant, Buyurtmalar |
| chef | Oshxona (KDS) |
| cashier | Buyurtmalar, Kassa |

Xodimlarni **company_admin** `/staff` sahifasida yaratadi.

## 6. Telegram Mini App

1. Kompaniya `settings_json` ga bot tokenini qo'shing:
   `{"telegram_bot_token": "123456:ABC..."}` (super-admin kompaniya tahriri orqali
   yoki tinker bilan).
2. Menyu tugmasini o'rnating:
   ```bash
   docker compose exec app php artisan telegram:setup oq-saroy
   ```
   Bu botning "Menyu" tugmasini `FRONTEND_URL/tg?company=oq-saroy` ga ulaydi.
3. Mijoz bot orqali Mini App'ni ochadi → menyu → savat → buyurtma. Buyurtma
   real-time KDS ekranida paydo bo'ladi.

### Telegramsiz (dev) test
`APP_DEBUG=true` bo'lganda Mini App'ni oddiy brauzerda ochish mumkin:
`http://localhost:3000/tg?company=oq-saroy&dev_id=12345` — `X-Telegram-Dev-Id`
sarlavhasi orqali soxta mijoz ishlatiladi (faqat dev).

## 7. Testlar

```bash
docker compose exec app composer test
```

Yangi testlar: `TelegramOrderTest`, `StaffManagementTest`, `OrderBroadcastTest`.

## Oqim (end-to-end)

Mijoz (TG) yoki ofitsiant buyurtma beradi → **KDS** da darhol ko'rinadi (ovoz bilan)
→ oshpaz **"Tayyor"** bosadi → ofitsiantga real-time ogohlantirish → ofitsiant
**"Berildi"** → kassir **naqd/karta** bilan to'lovni qabul qiladi → smena yopiladi.
