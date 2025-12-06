# فست‌کیوآر (FeastQR)

سامانه متن‌باز منوی آنلاین برای رستوران‌ها که امکان ساخت منوی دیجیتال، چاپ کد QR و مدیریت سفارش را به صورت یکپارچه فراهم می‌کند. زبان پیش‌فرض و رابط کاربری اکنون کاملاً فارسی است و درگاه پرداخت به زرین‌پال تغییر یافته است.

## امکانات اصلی
- ساخت منوی دیجیتال چندزبانه با ترجمه فارسی پیش‌فرض
- مدیریت و چاپ کارت‌های QR برای هر منو
- ویرایش سریع قیمت و موجودی بدون نیاز به چاپ مجدد
- تولید PDF آماده چاپ برای منو
- یکپارچگی با زرین‌پال برای خرید اشتراک
- پشتیبانی از Supabase، Prisma، TRPC و Next.js 14 (App Router)

## پشته فناوری
- **Next.js 14** با دایرکتوری `app`
- **Supabase/PostgreSQL** به عنوان پایگاه داده و احراز هویت
- **Prisma** برای ORM
- **TRPC** برای API تایپ‌محور
- **TailwindCSS + shadcn/ui** برای رابط کاربری
- **i18next** برای چندزبانه بودن (fa، en، pl)

## پیش‌نیازها
- Node.js 20 به بالا
- دسترسی به Supabase و یک حساب زرین‌پال
- ابزار `pnpm` (در Docker با corepack فعال می‌شود)

## متغیرهای محیطی
نمونه `.env.example` را به `.env` کپی کرده و مقداردهی کنید. متغیرهای مهم پرداخت:

```env
ZARINPAL_MERCHANT_ID=
ZARINPAL_AMOUNT=10000
ZARINPAL_CALLBACK_URL=https://your-domain.com/payments-api/zarinpal-callback
ZARINPAL_SANDBOX=false # در صورت استفاده از سن‌باکس مقدار را true کنید
ZARINPAL_SUCCESS_REDIRECT=https://your-domain.com/dashboard
ZARINPAL_FAILURE_REDIRECT=https://your-domain.com/billing?status=failed
ZARINPAL_SUBSCRIPTION_DAYS=30
ZARINPAL_PAYMENT_PORTAL_URL=https://www.zarinpal.com/pg/services/payment
```

> نکته: پیش از اجرای Docker یا حالت محلی، فایل `.env` را با دستور زیر از نمونه بسازید و مقادیر را تکمیل کنید:
> ```bash
> cp .env.example .env
> ```

## راه‌اندازی محلی
```bash
pnpm install
pnpm dev
```
پیش از اجرای پروژه مطمئن شوید مقادیر Supabase و زرین‌پال در `.env` تکمیل شده باشند.

## آماده‌سازی و استقرار روی دامنه جدید (Production)
۱. **دامنه و پیش‌نیازها**
   - دامنه‌ای که قرار است روی آن سرویستان را با Reverse Proxy (مثلاً Nginx) به پورت 3070 متصل کنید داشته باشید.
   - یک پروژه Supabase یا PostgreSQL آماده با دسترسی `Service Role` و `Anon Key`.
   - مرچنت کد زرین‌پال و آدرس‌های دامنه نهایی برای صفحات Redirect و Callback.

۲. **فایل محیطی را برای دامنه نهایی پر کنید**
   ```bash
   cp .env.example .env
   ```
   سپس موارد زیر را با دامنه و پروژه خود جایگزین کنید:
   - `NEXT_PUBLIC_SUPABASE_URL` و کلیدهای `NEXT_PUBLIC_SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_KEY`.
   - `DATABASE_URL` و `DIRECT_URL` بر اساس همان پروژه Supabase/Postgres.
   - لینک‌های `ZARINPAL_CALLBACK_URL`، `ZARINPAL_SUCCESS_REDIRECT` و `ZARINPAL_FAILURE_REDIRECT` را با دامنه نهایی (مثلاً `https://example.com`) جایگزین کنید.
   - اگر در محیط سن‌باکس زرین‌پال هستید `ZARINPAL_SANDBOX=true` بگذارید؛ برای پروداکشن مقدار پیش‌فرض `false` را حفظ کنید.

۳. **بیلد و اجرای Docker بدون تغییر کد**
   ```bash
   docker build -t feastqr:latest .
   docker compose up -d
   ```
   سرویس روی پورت 3070 بالا می‌آید. تنها کافی است Reverse Proxy خود را به این پورت متصل کنید و گواهی TLS دامنه را روی وب‌سرور (نه برنامه) تنظیم نمایید.

۴. **بررسی سلامت**
   - لاگ‌ها را با `docker compose logs -f` بررسی کنید.
   - صفحه لاگین در دامنه جدید را باز کنید؛ در صورت خطای اتصال پایگاه داده، مقداردهی‌های `.env` را مرور کنید.

۵. **به‌روزرسانی آتی**
   ```bash
   git pull
   docker build -t feastqr:latest .
   docker compose up -d --force-recreate
   ```

> نکته: الگوی تصاویر از هر دامنه‌ی `*.supabase.co` پشتیبانی می‌کند تا برای هر پروژه Supabase بدون تغییر کد کار کند.

## پرداخت زرین‌پال
- درخواست پرداخت از طریق زرین‌پال ساخته می‌شود و کاربر به درگاه هدایت می‌شود.
- پس از بازگشت از درگاه، مسیر `payments-api/zarinpal-callback` پرداخت را تأیید کرده و اشتراک را در جدول `subscriptions` به‌روزرسانی می‌کند.
- وضعیت‌های اشتراک شامل `pending`، `paid` و `cancelled` است.

## داکر
پروژه داکرایز شده و خروجی `standalone` برای Next.js استفاده می‌شود.

> **نکته:** برای اینکه بدون تنظیم دستی اولیه بتوانید تصویر را بسازید، در `Dockerfile`
> مقادیر پیش‌فرض Supabase و زرین‌پال (مبتنی بر پیکربندی محلی Supabase CLI) درج
> شده است. در محیط اجرا حتماً `.env` خود را روی سرویس سوار کنید تا این مقادیر
> جایگزین شوند و اتصال به پروژه/درگاه واقعی برقرار گردد.

### راهنمای صفر تا صد اجرا با Docker (مبتدیان)
1. **پیش‌نیازها را نصب کنید:**
   - Docker Desktop یا Docker Engine و Docker Compose روی سیستم شما نصب و فعال باشد.
   - مطمئن شوید دستور `docker info` بدون خطا اجرا می‌شود.
2. **پروژه را دریافت کنید:**
   ```bash
   git clone https://github.com/FeastQR/FeastQR.git
   cd FeastQR
   ```
3. **فایل محیطی را آماده کنید:**
   ```bash
   cp .env.example .env
   ```
   سپس در فایل `.env` مقادیر Supabase/PostgreSQL، آدرس‌های زرین‌پال و دامنه/پورت نهایی سرویس را وارد کنید.
4. **بیلد تصویر:**
   ```bash
   docker build -t feastqr:latest .
   ```
   اگر هنگام بیلد با ارورهای TypeScript مشابه `languageId implicitly has an 'any' type` روبه‌رو شدید، ابتدا کد را به‌روزرسانی و سپس دوباره بیلد کنید.
5. **اجرای کانتینر به صورت ساده:**
   ```bash
   docker run -d --name feastqr -p 3070:3070 --env-file .env feastqr:latest
   ```
   حالا برنامه روی پورت 3070 در دسترس است: `http://localhost:3070`.
6. **اجرای پایدار با Docker Compose (ترجیحی):**
   - فایل `docker-compose.yml` موجود است. کافی است اجرا کنید:
     ```bash
     docker compose up -d
     ```
   - در صورت نیاز به لاگ‌ها:
     ```bash
     docker compose logs -f
     ```
7. **بستن سرویس:**
   ```bash
   docker compose down
   ```
   یا اگر بدون Compose اجرا کرده‌اید:
   ```bash
   docker stop feastqr && docker rm feastqr
   ```
8. **به‌روزرسانی:**
   ```bash
   git pull
   docker build -t feastqr:latest .
   docker compose up -d --force-recreate
   ```
9. **سوالات متداول کوتاه:**
   - *پایگاه داده جدا لازم است؟* بله، Docker فایل دیتابیس ندارد؛ به Supabase یا PostgreSQL خارجی وصل شوید و مقادیر را در `.env` بنویسید.
   - *چطور می‌فهمم متغیرها درست‌اند؟* بعد از بالا آمدن سرویس، صفحه لاگین را باز کنید؛ خطاهای اتصال پایگاه داده در `docker compose logs` دیده می‌شود.

### ساخت تصویر
```bash
docker build -t feastqr:latest .
```

### اجرای سریع با Docker Compose
1. یک بار فایل `.env` را از نمونه کپی کنید و مقادیر دیتابیس/Supabase و زرین‌پال را بنویسید:
   ```bash
   cp .env.example .env
   ```
2. سرویس را بالا بیاورید:
```bash
docker compose up -d
```
سرویس روی پورت 3070 در دسترس است. تنها کاری که لازم است انجام دهید تنظیم Reverse Proxy (مثلاً Nginx) روی همین پورت است.

## نکات پایانی
- برای تولید کلاینت Prisma پس از نصب، اسکریپت `postinstall` به صورت خودکار اجرا می‌شود.
- اگر قصد استفاده از محیط سن‌باکس زرین‌پال را دارید، `ZARINPAL_SANDBOX=true` را نگه دارید.
- برای زبان‌های دیگر می‌توانید از منوی تغییر زبان داخل داشبورد استفاده کنید.
