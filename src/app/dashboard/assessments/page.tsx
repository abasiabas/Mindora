import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AssessmentsListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assessments } = await supabase
    .from("assessments")
    .select("code, name, description")
    .eq("is_active", true);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-700">ارزیابی‌ها</h1>
      <p className="text-sm text-slate-500">
        این ابزارها فقط برای غربالگری خوداظهاری هستند و جایگزین تشخیص یک متخصص نیستند.
      </p>

      <div className="flex flex-col gap-4">
        {(assessments ?? []).map((a) => (
          <a
            key={a.code}
            href={`/dashboard/assessments/${a.code}`}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-500"
          >
            <h2 className="text-lg font-medium text-brand-700">{a.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{a.description}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
