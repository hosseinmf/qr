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
ZARINPAL_CALLBACK_URL=http://localhost:3000/payments-api/zarinpal-callback
ZARINPAL_SANDBOX=true
ZARINPAL_SUCCESS_REDIRECT=http://localhost:3000/dashboard
ZARINPAL_FAILURE_REDIRECT=http://localhost:3000/billing?status=failed
ZARINPAL_SUBSCRIPTION_DAYS=30
ZARINPAL_PAYMENT_PORTAL_URL=https://www.zarinpal.com/pg/services/payment
```

## راه‌اندازی محلی
```bash
pnpm install
pnpm dev
```
پیش از اجرای پروژه مطمئن شوید مقادیر Supabase و زرین‌پال در `.env` تکمیل شده باشند.

## پرداخت زرین‌پال
- درخواست پرداخت از طریق زرین‌پال ساخته می‌شود و کاربر به درگاه هدایت می‌شود.
- پس از بازگشت از درگاه، مسیر `payments-api/zarinpal-callback` پرداخت را تأیید کرده و اشتراک را در جدول `subscriptions` به‌روزرسانی می‌کند.
- وضعیت‌های اشتراک شامل `pending`، `paid` و `cancelled` است.

## داکر
پروژه داکرایز شده و خروجی `standalone` برای Next.js استفاده می‌شود.

### ساخت تصویر
```bash
docker build -t feastqr:latest .
```

### اجرای سریع با Docker Compose
```bash
docker compose up -d
```
سرویس روی پورت 3000 در دسترس است. تنها کاری که لازم است انجام دهید تنظیم Reverse Proxy (مثلاً Nginx) روی همین پورت است.

## نکات پایانی
- برای تولید کلاینت Prisma پس از نصب، اسکریپت `postinstall` به صورت خودکار اجرا می‌شود.
- اگر قصد استفاده از محیط سن‌باکس زرین‌پال را دارید، `ZARINPAL_SANDBOX=true` را نگه دارید.
- برای زبان‌های دیگر می‌توانید از منوی تغییر زبان داخل داشبورد استفاده کنید.
