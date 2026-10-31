# SEO (#27) — merge'dan keyingi qadamlar

1. **nginx** — `nginx-seo.conf` dagi ikki o'zgarish (`/`, `/ru`, `/sitemap.xml`, `/r/*` → Laravel; `www` → 301).
2. **.env** (ixtiyoriy, bo'lsa landing'da chiqadi):
   ```
   PLATFORM_CONTACT_PHONE=+998...
   PLATFORM_CONTACT_TELEGRAM=kitchens_uz      # @ siz
   GOOGLE_SITE_VERIFICATION=...               # Search Console → HTML tag
   YANDEX_VERIFICATION=...                    # Yandex Webmaster → Meta tag
   ```
   so'ng `php artisan config:cache`.
3. **Search Console** va **Yandex Webmaster** — saytni qo'shish, `https://kitchens.uz/sitemap.xml` ni yuborish.
4. Restoranlar: panel → «Restoran sahifasi» → shahar, manzil, ish vaqti → «Sahifa ochiq». Faqat yoqilganlari sitemap'ga tushadi.
