import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const entitlements = await getEntitlements(user.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-700">داشبورد</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">پلن فعلی</p>
        <p className="mt-1 text-lg font-medium text-brand-700">{entitlements.planCode}</p>
        <p className="mt-3 text-sm text-slate-500">
          سقف پیام روزانه: <span className="font-medium text-slate-700">{entitlements.dailyMessageLimit}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <a
          href="/dashboard/chat"
          className="rounded-lg bg-brand-500 px-6 py-3 text-center text-white transition hover:bg-brand-600"
        >
          شروع گفتگو
        </a>
        <a
          href="/dashboard/assessments"
          className="rounded-lg border border-brand-500 px-6 py-3 text-center text-brand-700 transition hover:bg-brand-50"
        >
          ارزیابی‌ها (PHQ-9 / GAD-7)
        </a>
      </div>
    </main>
  );
}
