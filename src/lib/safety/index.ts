// ============================================================================
// MINDORA Safety Layer — Phase 10 (technical scaffolding)
// ============================================================================
// IMPORTANT / HONEST LIMITATION:
// This is a first-pass, keyword/heuristic-based classifier. It is a real,
// working safety net (fail-closed on medication requests; flags crisis
// language for human/clinical-grade follow-up) — but it is NOT a clinical
// risk-assessment tool and must not be presented to users or stakeholders
// as one. Two things must happen before this goes in front of real users:
//   1. A licensed clinician reviews and expands the detection phrase sets
//      and the exact wording shown to a user in crisis (see resources.ts).
//   2. This heuristic layer should be paired with a model-based classifier
//      (bind 51 "AI Response Contract" / evidence_required field) once
//      GEMINI_API_KEY is configured — heuristics alone will miss paraphrased
//      or indirect expressions of risk.
// Per bind 71, no agent — including a future Manager Agent — may bypass or
// weaken this layer. This module has no "override" parameter anywhere.
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";

export type SafetyEventType =
  | "crisis"
  | "self_harm"
  | "suicide_risk"
  | "abuse"
  | "severe_distress"
  | "medication_request"
  | "diagnosis_request"
  | "out_of_scope"
  | "unsupported_evidence";

export type SafetySeverity = "low" | "medium" | "high" | "critical";

export interface SafetyCheckResult {
  status: "ok" | "flagged" | "escalated" | "blocked";
  events: { type: SafetyEventType; severity: SafetySeverity }[];
  userMessage?: string;
}

const SUICIDE_RISK_PATTERNS = [
  /خودکش/i, /خود.?کشی/i, /می.?خوام بمیرم/i, /دیگه نمی.?خوام زندگی کنم/i,
  /suicide/i, /kill myself/i, /end my life/i, /want to die/i,
];

const SELF_HARM_PATTERNS = [
  /آسیب.?زدن به خودم/i, /خودآزاری/i, /خود.?زنی/i,
  /self.?harm/i, /cutting myself/i, /hurt myself/i,
];

const ABUSE_PATTERNS = [
  /کتک می.?زنه/i, /مورد آزار.*قرار/i, /خشونت خانگی/i,
  /domestic violence/i, /being abused/i,
];

const MEDICATION_PATTERNS = [
  /چه دارویی/i, /چه قرصی/i, /دوز(اژ)? (چقدر|مناسب)/i, /میلی.?گرم/i,
  /قطع (کنم )?دارو/i, /داروم رو (قطع|کم|زیاد)/i, /مصرف کنم چقدر/i,
  /\b(prozac|zoloft|xanax|ssri|benzodiazepine|sertraline|fluoxetine)\b/i,
  /what (medication|dose|dosage)/i, /should I (stop|start) taking/i,
  /prescri(be|ption)/i,
];

const DIAGNOSIS_REQUEST_PATTERNS = [
  /من (افسردگی|اضطراب|دوقطبی|OCD) دارم\??/i, /تشخیص بده/i, /مبتلا به .* هستم\??/i,
  /do I have (depression|anxiety|bipolar|ocd)/i, /diagnose me/i,
];

const OUT_OF_SCOPE_HINTS = [
  /آب.?وهوا/i, /فوتبال/i, /دستور پخت/i, /برنامه.?نویسی/i, /سهام/i,
  /weather/i, /recipe/i, /football score/i, /write code/i, /stock price/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function scanUserMessage(text: string): SafetyCheckResult {
  const events: SafetyCheckResult["events"] = [];

  if (matchesAny(text, SUICIDE_RISK_PATTERNS)) events.push({ type: "suicide_risk", severity: "critical" });
  if (matchesAny(text, SELF_HARM_PATTERNS)) events.push({ type: "self_harm", severity: "high" });
  if (matchesAny(text, ABUSE_PATTERNS)) events.push({ type: "abuse", severity: "high" });
  if (matchesAny(text, MEDICATION_PATTERNS)) events.push({ type: "medication_request", severity: "medium" });
  if (matchesAny(text, DIAGNOSIS_REQUEST_PATTERNS)) events.push({ type: "diagnosis_request", severity: "low" });
  if (matchesAny(text, OUT_OF_SCOPE_HINTS)) events.push({ type: "out_of_scope", severity: "low" });

  const hasCritical = events.some((e) => e.severity === "critical");
  const hasBlocking = events.some((e) => e.type === "medication_request" || e.type === "suicide_risk" || e.type === "self_harm");

  let status: SafetyCheckResult["status"] = "ok";
  if (hasCritical) status = "escalated";
  else if (hasBlocking) status = "blocked";
  else if (events.length > 0) status = "flagged";

  return { status, events };
}

export async function recordSafetyEvents(
  userId: string,
  conversationId: string | null,
  result: SafetyCheckResult
): Promise<void> {
  if (result.events.length === 0) return;
  const admin = createAdminClient();
  const actionTaken =
    result.status === "escalated" ? "escalated" : result.status === "blocked" ? "blocked_response" : "flagged_for_review";
  await admin.from("safety_events").insert(
    result.events.map((e) => ({
      user_id: userId,
      conversation_id: conversationId,
      event_type: e.type,
      severity: e.severity,
      action_taken: actionTaken,
    }))
  );
}

export function validateAiResponse(responseText: string): { safe: boolean; reason?: string } {
  if (matchesAny(responseText, MEDICATION_PATTERNS)) {
    return { safe: false, reason: "response_contains_medication_content" };
  }
  return { safe: true };
}
