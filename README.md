# MINDORA — روانشناس جیبی

پلتفرم هوشمند پشتیبان روانشناختی، مبتنی بر شواهد علمی (Evidence-Based)، با معماری
Multi-Agent، حریم خصوصی به‌عنوان اصل طراحی، و کنترل کامل subscription/entitlement
در سمت سرور.

> ⚠️ MINDORA جایگزین روانشناس، روانپزشک، پزشک یا خدمات اورژانسی نیست.

## وضعیت فعلی (Phase 4–5 تکمیل‌شده)

این ریپو در حال ساخت مرحله‌به‌مرحله است — طبق قانون «هیچ Feature بدون Backend واقعی
تحویل داده نمی‌شود». وضعیت هر فاز در [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
به‌روز نگه داشته می‌شود.

- ✅ Phase 4 — Database Schema (`supabase/migrations/0001_core_schema.sql`)
- ✅ Phase 4 — Row Level Security (`supabase/migrations/0002_rls_policies.sql`)
- ✅ Phase 5 — Authentication (Email + Google OAuth via Supabase Auth)
- ✅ Entitlement Engine اسکلت اولیه (`src/lib/entitlements`)
- ⬜ Phase 6 — Subscription UI + ZarinPal Payment
- ⬜ Phase 8 — Multi-Agent AI Pipeline
- ⬜ Phase 9 — Evidence Engine / RAG
- ⬜ Phase 10 — Safety Layer (نیازمند تأیید متخصص بالینی قبل از انتشار)
- ⬜ Phase 11–20 — طبق `docs/ARCHITECTURE.md`

## راه‌اندازی محلی

```bash
npm install
cp .env.example .env.local   # مقادیر واقعی را از Supabase/ZarinPal پر کنید
npm run dev
```

### دیتابیس

1. یک پروژه Supabase بسازید.
2. migration‌های داخل `supabase/migrations/` را به ترتیب اجرا کنید
   (از طریق Supabase CLI یا SQL Editor).
3. تایپ‌های TypeScript را بازتولید کنید:
   ```bash
   npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
   ```
4. در Supabase Auth، Google OAuth provider را با `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET` فعال کنید.

### دیپلوی روی Railway

- `railway.json` آماده است (Nixpacks build + health check روی `/api/health`).
- تمام مقادیر `.env.example` را در Railway → Variables تنظیم کنید.
- هرگز `SUPABASE_SERVICE_ROLE_KEY` را در فرانت‌اند یا کد کلاینت import نکنید —
  فقط در `src/lib/supabase/admin.ts` و فقط سمت سرور استفاده می‌شود.

## اصول غیرقابل‌مذاکره (از سند اصلی پروژه)

- بدون تجویز دارو، تحت هیچ شرایطی (Medication Safety Layer — چندلایه).
- بدون پاسخ تخصصی بدون Evidence معتبر.
- تمام محدودیت‌های Subscription باید Backend-enforced باشند (`entitlements.ts`)،
  نه فقط مخفی‌شده در UI.
- RLS باید همیشه فعال و تست‌شده باشد؛ Service Role Key فقط سمت سرور.
- هیچ داده‌ای بین سازمان‌ها یا کاربران نشت نکند (Multi-Tenant Isolation).

## ساختار پوشه‌ها

```
src/
  app/                → صفحات Next.js (App Router)
  lib/supabase/        → کلاینت‌های Supabase (browser / server / admin)
  lib/entitlements/    → موتور کنترل دسترسی طبق Plan
  types/               → تایپ‌های تولیدشده از Supabase
supabase/migrations/    → schema + RLS، به ترتیب اجرا شوند
docs/ARCHITECTURE.md    → نقشه راه فازها و تصمیمات معماری
```
