import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreAssessment, buildInterpretationNote } from "@/lib/assessments/scoring";
import { formatCrisisMessage } from "@/lib/safety/resources";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code: string | undefined = body?.code;
  const answers: Record<string, number> | undefined = body?.answers;

  if ((code !== "phq9" && code !== "gad7") || !answers || typeof answers !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("code", code)
    .single();

  if (!assessment) {
    return NextResponse.json({ error: "assessment_not_found" }, { status: 404 });
  }

  const { score, band, item9Flag } = scoreAssessment(code, answers);
  const interpretationNote = buildInterpretationNote(code, band);

  const { data: result, error: insertError } = await supabase
    .from("assessment_results")
    .insert({
      user_id: user.id,
      assessment_id: assessment.id,
      answers,
      score,
      interpretation_note: interpretationNote,
    })
    .select("id, created_at")
    .single();

  if (insertError || !result) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  if (item9Flag) {
    const admin = createAdminClient();
    await admin.from("safety_events").insert({
      user_id: user.id,
      event_type: "suicide_risk",
      severity: "critical",
      action_taken: "escalated_via_assessment",
    });
  }

  return NextResponse.json({
    resultId: result.id,
    score,
    band: band.label,
    interpretationNote,
    crisisMessage: item9Flag ? formatCrisisMessage() : null,
  });
}
