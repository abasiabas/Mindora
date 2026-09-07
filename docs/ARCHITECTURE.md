# MINDORA — نقشه راه فازها

| فاز | عنوان | وضعیت | یادداشت |
|---|---|---|---|
| 1 | Repository Audit | ✅ | |
| 2 | Architecture Audit | ✅ | |
| 3 | Security Audit | 🟡 | RLS تست شد (anon نمی‌تونه پروفایل ببینه، پلن‌های عمومی قابل‌مشاهده‌ان)؛ تست نفوذ کامل باقی مانده |
| 4 | Database Design | ✅ | روی Supabase واقعی (`mindora`) deploy و verify شده |
| 4b | RLS | ✅ | تست شد؛ ۳ خطای Advisor (RLS جاافتاده روی roles/permissions) پیدا و رفع شد؛ Advisor الان تمیزه |
| 5 | Authentication | ✅ | Email فعال؛ Google OAuth نیازمند تنظیم دستی در Supabase Dashboard |
| 6 | Subscription / Entitlement | 🟡 | Engine + پلن‌های seed شده آماده؛ UI و ZarinPal باقی مانده |
| 7 | Payment (ZarinPal) | ⬜ | |
| 8 | AI / Multi-Agent | ⬜ | نیازمند `OPENAI_API_KEY` — هنوز تنظیم نشده |
| 9 | Evidence / RAG | ⬜ | جدول‌ها آماده (evidence_sources seed شده با ۶ منبع Tier 1)؛ pipeline باقی مانده |
| **10** | **Safety Layer** | 🟡 **جدید** | Input Safety + Output Safety heuristic پیاده و در `/api/chat/send` فعال — **هنوز نیازمند بازبینی متخصص بالینی و تقویت با مدل زبانی** |
| 11 | Memory / KB | 🟡 | |
| 12 | Assessment | 🟡 | |
| 13 | Progress | 🟡 | |
| 14 | Organization | 🟡 | |
| 15 | Owner Dashboard | ⬜ | |
| 16 | Frontend / UX | 🟡 | |
| 17 | Testing | ⬜ | |
| 18 | Security Audit (Final) | ⬜ | |
| 19 | Railway Deployment | ✅ | **زنده**: https://mindora-web-production-8f0b.up.railway.app |
| 20 | Final QA | ⬜ | |

## زیرساخت زنده (Live Infrastructure)

- **GitHub:** github.com/abasiabas/Mindora (branch `main`)
- **Supabase:** project `mindora` (ref: `yzarfrtzpaqbwnttxber`) — ACTIVE_HEALTHY
- **Railway:** project `mindora` → service `mindora-web` — SUCCESS
  - Public URL: https://mindora-web-production-8f0b.up.railway.app
  - Health check: `/api/health`

## این راند چه‌کاری اضافه شد (Phase 10 — Safety Layer، فنی)

فایل‌های جدید:
- `src/lib/safety/index.ts` — تشخیص heuristic برای: suicide_risk، self_harm، abuse،
  medication_request، diagnosis_request، out_of_scope. خروجی هر پیام به یکی از
  چهار وضعیت می‌رسه: `ok` / `flagged` / `blocked` / `escalated`.
- `src/lib/safety/resources.ts` — شماره‌های اورژانس واقعی و تأییدشده‌ی ایران
  (۱۲۳ اورژانس اجتماعی بهزیستی، ۱۴۸۰ خط مشاوره، ۱۱۵ اورژانس پزشکی) — منبع:
  behzisti.ir، شهریور ۱۴۰۵. **این شماره‌ها را بدون تأیید مجدد از منبع رسمی
  تغییر ندهید.**
- `src/app/api/chat/send/route.ts` — مسیر واقعی که Auth → Entitlement (سقف
  پیام روزانه) → Safety رو به ترتیب اجرا می‌کنه. پیام بحرانی هرگز به مدل AI
  نمی‌رسه؛ درخواست دارویی همیشه مسدود می‌شه.

## ⚠️ محدودیت صادقانه‌ی این پیاده‌سازی (طبق بند ۷۶ — ممنوعیت Fake Completion)

این safety layer **heuristic/keyword-based** است، نه یک ابزار بالینی معتبر:
- عبارات غیرمستقیم یا استعاری بحران رو ممکنه تشخیص نده.
- قبل از قرار گرفتن در برابر کاربران واقعی، باید:
  1. یک متخصص بالینی مجاز (روانپزشک/روانشناس بالینی) الگوهای تشخیص و متن
     دقیق پیام بحران رو بازبینی و تکمیل کنه.
  2. این لایه با یک طبقه‌بند مبتنی بر مدل زبانی (بعد از تنظیم
     `OPENAI_API_KEY`) تقویت بشه — heuristic به‌تنهایی عبارات غیرمستقیم رو
     از دست می‌ده.
- مسیر AI Consultation واقعی (پاسخ‌دهی) هنوز پیاده نشده — `/api/chat/send`
  فعلاً فقط تا Safety Layer پیش می‌ره و صادقانه می‌گه "لایه AI هنوز آماده
  نیست"، به‌جای جعل یک پاسخ.

## تصمیمات معماری قبلی (بدون تغییر)

- فینگرپرینت دستگاه استفاده نشد؛ فقط session/refresh-token.
- Assessment instruments باید Public Domain باشن (PHQ-9، GAD-7).
- Helper functionهای RLS (`auth_is_staff` و...) به schema جداگانه‌ی
  `internal` منتقل شدن تا هم از طریق RLS کار کنن، هم مستقیم از طریق
  PostgREST RPC قابل فراخوانی نباشن (رفع یه یافته‌ی امنیتی Advisor).

## گام بعدی پیشنهادی

1. **Evidence Engine پایه** — چون Safety Layer الان آماده‌ست، منطقی‌ترین گام
   بعدی ساخت یک RAG ساده روی جدول `evidence_items` (که ۶ منبع Tier 1 داره)
   است، تا وقتی AI پاسخ می‌ده واقعاً از شواهد استفاده کنه.
2. یا **Subscription UI + ZarinPal** — برای فعال‌سازی واقعی پلن‌های VIP.
3. یا وصل کردن `OPENAI_API_KEY` و ساخت اولین Agent واقعی (Intake Agent) که
   از Safety Layer عبور می‌ده.
