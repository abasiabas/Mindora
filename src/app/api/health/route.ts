// Railway health check endpoint (bind 47). Verifies the app can reach
// Supabase — a failing DB connection should surface as an unhealthy deploy,
// not a silently broken app.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("plans").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
