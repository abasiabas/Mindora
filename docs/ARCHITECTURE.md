# MINDORA — نقشه راه فازها

این فایل وضعیت واقعی هر فاز را دنبال می‌کند تا هرگز یک Feature ناقص به‌عنوان
"Completed" اعلام نشود (طبق بند ۷۶ سند اصلی).

| فاز | عنوان | وضعیت | یادداشت |
|---|---|---|---|
| 1 | Repository Audit | ✅ | ریپو خالی بود؛ فقط README — از صفر شروع شد |
| 2 | Architecture Audit | ✅ | معماری این سند مبنا قرار گرفت |
| 3 | Security Audit | ⬜ (اولیه) | RLS طراحی شد؛ تست نفوذ واقعی هنوز انجام نشده |
| 4 | Database Design | ✅ | `0001_core_schema.sql`، ۲۶ جدول اصلی |
| 4b | RLS | ✅ (نیازمند تست) | `0002_rls_policies.sql` — باید روی Supabase واقعی تست شود |
| 5 | Authentication | ✅ | Email + Google OAuth، auth callback با provisioning خودکار |
| 6 | Subscription / Entitlement | 🟡 | `entitlements.ts` نوشته شد؛ UI و Admin Panel باقی مانده |
| 7 | Payment (ZarinPal) | ⬜ | جدول `payments` آماده؛ اتصال واقعی به API ZarinPal باقی مانده |
| 8 | AI / Multi-Agent | ⬜ | نیازمند تصمیم: کدام Agentها ابتدا (پیشنهاد: Safety + Intake + Manager) |
| 9 | Evidence / RAG | ⬜ | جدول `evidence_sources`/`evidence_items` آماده؛ pipeline واقعی باقی مانده |
| 10 | Safety Layer | ⬜ | **نیازمند بازبینی متخصص بالینی قبل از production** |
| 11 | Memory / KB | 🟡 | جدول‌ها آماده؛ منطق consent-gated storage باقی مانده |
| 12 | Assessment | 🟡 | جدول‌ها آماده؛ باید ابزارهای معتبر و دارای مجوز انتخاب شوند (مثلاً PHQ-9, GAD-7) |
| 13 | Progress | 🟡 | جدول‌ها آماده؛ UI و تحلیل روند باقی مانده |
| 14 | Organization | 🟡 | جدول‌ها + RLS isolation آماده؛ Dashboard باقی مانده |
| 15 | Owner Dashboard | ⬜ | |
| 16 | Frontend / UX | 🟡 | صفحات Auth + Landing اولیه |
| 17 | Testing | ⬜ | |
| 18 | Security Audit (Final) | ⬜ | |
| 19 | Railway Deployment | 🟡 | `railway.json` + health check آماده؛ نیازمند دیپلوی واقعی برای تست |
| 20 | Final QA | ⬜ | |

راهنمای نماد: ✅ کامل و قابل استفاده · 🟡 اسکلت آماده، نیازمند تکمیل · ⬜ شروع‌نشده

## تصمیمات معماری مهم

- **فینگرپرینت دستگاه حذف شد** (برخلاف اشاره‌ی اولیه به "device fingerprint امن"
  در سند اصلی) — به‌جای آن از ترکیب `device_label` (که کاربر/سرور تعیین می‌کند)
  + `session` + `refresh token rotation` استفاده می‌شود تا با اصول حریم خصوصی
  در تضاد نباشد.
- **Assessment instruments**: باید فقط از ابزارهای دارای مجوز/عمومی معتبر
  (مثل PHQ-9، GAD-7 که Public Domain هستند) استفاده شود؛ ابزارهای دارای
  کپی‌رایت تجاری نیاز به مجوز رسمی دارند.
- **Safety Layer محتوایی** (نه معماری فنی‌اش) باید قبل از انتشار عمومی توسط
  یک متخصص بالینی مجاز (روانپزشک/روان‌شناس بالینی) بازبینی شود. من می‌توانم
  Pipeline فنی (تشخیص، escalation، audit) را بسازم؛ محتوای بحرانی (چه گفته شود
  در لحظه بحران) نباید صرفاً بر پایه‌ی مدل زبانی نهایی شود.

## گام بعدی پیشنهادی

با توجه به اینکه پایه (DB + Auth + Entitlement) آماده است، منطقی‌ترین گام بعدی
یکی از این‌هاست:
1. **Safety Layer فنی** (بدون محتوای بالینی نهایی) — چون همه‌چیز دیگر باید از
   این عبور کند.
2. **Subscription UI + ZarinPal** — چون بدون این، هیچ پلن VIP فعال نمی‌شود.
3. **Manager Agent + Intake Agent** پایه — اسکلت Multi-Agent با placeholder
   برای Evidence (تا Evidence Engine کامل شود).
