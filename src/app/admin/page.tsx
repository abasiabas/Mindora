import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

interface UserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  status: string | null;
  createdAt: string;
  roles: string[];
  planCode: string;
}

export default async function AdminUsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, status, created_at")
    .order("created_at", { ascending: false });

  const { data: authUsersData } = await admin.auth.admin.listUsers();
  const emailById = new Map(
    (authUsersData?.users ?? []).map((u) => [u.id, u.email ?? null])
  );

  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id, roles(name)");
  const rolesById = new Map<string, string[]>();
  for (const r of roleRows ?? []) {
    const roleName = (r.roles as unknown as { name: string } | null)?.name;
    if (!roleName) continue;
    const existing = rolesById.get(r.user_id) ?? [];
    existing.push(roleName);
    rolesById.set(r.user_id, existing);
  }

  const { data: subRows } = await admin
    .from("subscriptions")
    .select("user_id, status, plans(code)")
    .eq("status", "active");
  const planCodeById = new Map(
    (subRows ?? []).map((s) => [
      s.user_id,
      (s.plans as unknown as { code: string } | null)?.code ?? "free",
    ])
  );

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? null,
    fullName: p.full_name,
    status: p.status,
    createdAt: p.created_at,
    roles: rolesById.get(p.id) ?? ["USER"],
    planCode: planCodeById.get(p.id) ?? "free",
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-brand-700">مدیریت کاربران</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length.toLocaleString("fa-IR")} کاربر ثبت‌نام‌شده
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ایمیل</th>
              <th className="px-4 py-3 font-medium">نام</th>
              <th className="px-4 py-3 font-medium">پلن</th>
              <th className="px-4 py-3 font-medium">نقش‌ها</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">تاریخ ثبت‌نام</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-700">{row.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{row.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{row.planCode}</td>
                <td className="px-4 py-3 text-slate-700">{row.roles.join("، ")}</td>
                <td className="px-4 py-3 text-slate-500">{row.status ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(row.createdAt).toLocaleDateString("fa-IR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
