// ⚠️ SERVER-ONLY. Uses the Supabase Service Role Key, which bypasses RLS.
// NEVER import this file from a Client Component or expose it to the browser.
// Only use inside Route Handlers / Server Actions that perform privileged
// operations already gated by explicit role checks (see entitlements.ts).
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
