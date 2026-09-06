// Handles both email-confirmation links and Google OAuth redirects.
// Also finalizes the profile row + default role + consent record for a
// brand-new user, using the admin client (server-only, RLS bypass is
// intentional and scoped to first-time provisioning only).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectedFrom") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const admin = createAdminClient();
  const userId = data.user.id;

  // Idempotent provisioning: only inserts if the profile doesn't exist yet.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    await admin.from("profiles").insert({
      id: userId,
      full_name: data.user.user_metadata?.full_name ?? null,
      preferred_language: "fa",
    });

    await admin.from("user_roles").insert({ user_id: userId, role_id: 5 }); // USER

    await admin.from("consent_records").insert({
      user_id: userId,
      consent_type: "terms",
      granted: true,
      version: "v1",
    });

    // Enroll in the Free plan by default (bind 18) — plan row is
    // database-driven, never hardcoded pricing/limits here.
    const { data: freePlan } = await admin.from("plans").select("id").eq("code", "free").maybeSingle();
    if (freePlan) {
      await admin.from("subscriptions").insert({
        user_id: userId,
        plan_id: freePlan.id,
        status: "active",
        starts_at: new Date().toISOString(),
      });
    }

    await admin.from("audit_logs").insert({
      actor_id: userId,
      actor_role: "USER",
      action: "account_created",
      target_type: "profile",
      target_id: userId,
    });
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
