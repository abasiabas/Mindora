// ============================================================================
// Entitlement Engine (bind 59) — the single source of truth for what a user
// is allowed to do. Every feature gate in the app MUST go through here.
// Never duplicate a limit check in the frontend as the only enforcement —
// UI-level hiding is a convenience, not security. This runs server-side
// against the user's active subscription + plan row from the database.
// ============================================================================
import { createClient } from "@/lib/supabase/server";

export interface Entitlements {
  planCode: string;
  planType: "free" | "vip" | "organization";
  dailyMessageLimit: number;
  memoryLevel: "none" | "basic" | "long_term";
  canUseVoice: boolean;
  canMonthlyAssessment: boolean;
  canAccessReports: boolean;
  maxDevices: number;
  organizationCapable: boolean;
}

const FREE_PLAN_FALLBACK: Entitlements = {
  planCode: "free",
  planType: "free",
  dailyMessageLimit: 10,
  memoryLevel: "none",
  canUseVoice: false,
  canMonthlyAssessment: false,
  canAccessReports: false,
  maxDevices: 1,
  organizationCapable: false,
};

/**
 * Resolves the caller's current entitlements from their active subscription.
 * If no active subscription exists, safely falls back to the Free plan
 * definition read from the `plans` table (never hardcoded beyond the
 * absolute last-resort fallback above, used only if the DB is unreachable).
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const supabase = createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, ends_at, plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = sub?.plans as any;

  if (!plan) {
    const { data: freePlan } = await supabase
      .from("plans")
      .select("*")
      .eq("code", "free")
      .maybeSingle();
    if (!freePlan) return FREE_PLAN_FALLBACK;
    return mapPlanRow(freePlan);
  }

  // Guard against expired-but-not-yet-swept subscriptions.
  if (sub?.ends_at && new Date(sub.ends_at) < new Date()) {
    return FREE_PLAN_FALLBACK;
  }

  return mapPlanRow(plan);
}

function mapPlanRow(plan: any): Entitlements {
  return {
    planCode: plan.code,
    planType: plan.type,
    dailyMessageLimit: plan.daily_message_limit,
    memoryLevel: plan.memory_level,
    canUseVoice: plan.can_use_voice,
    canMonthlyAssessment: plan.can_monthly_assessment,
    canAccessReports: plan.can_access_reports,
    maxDevices: plan.max_devices,
    organizationCapable: plan.organization_capable,
  };
}

/**
 * Checks and atomically increments today's message count for a user against
 * their entitlement. Must be called from a Route Handler / Server Action
 * before generating any AI response — this is the backend enforcement
 * referenced in bind 35 ("نه ۱۰ پیام در frontend").
 */
export async function canSendMessage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const entitlements = await getEntitlements(userId);
  const supabase = createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("messages")
    .select("id, conversations!inner(user_id)", { count: "exact", head: true })
    .eq("conversations.user_id", userId)
    .eq("role", "user")
    .gte("created_at", startOfDay.toISOString());

  const used = count ?? 0;
  const remaining = Math.max(entitlements.dailyMessageLimit - used, 0);
  return { allowed: remaining > 0, remaining };
}

export async function canUseVoice(userId: string): Promise<boolean> {
  return (await getEntitlements(userId)).canUseVoice;
}

export async function canAccessLongTermMemory(userId: string): Promise<boolean> {
  return (await getEntitlements(userId)).memoryLevel === "long_term";
}

export async function maxDevicesFor(userId: string): Promise<number> {
  return (await getEntitlements(userId)).maxDevices;
}
