import { classifyIntake } from "@/lib/ai/agents/intake";
import { chatText } from "@/lib/ai/gemini";
import { validateAiResponse } from "@/lib/safety";
import { retrieveEvidence } from "@/lib/evidence/retrieve";
import type { AiResponseContract } from "@/lib/ai/contract";
import { isValidContract } from "@/lib/ai/contract";

const OUT_OF_SCOPE_MESSAGE =
  "مایندورا فقط می‌تونه درباره‌ی موضوعات روانشناسی، سلامت روان و روان‌درمانی صحبت کنه. اگه چیزی توی این حوزه‌ست، خوشحال می‌شم کمک کنم.";

const NO_EVIDENCE_ENGINE_PREFIX =
  "برای این موضوع خاص، منبع علمی مشخصی توی پایگاه‌داده‌ی مایندورا پیدا نکردم، پس نمی‌خوام ادعای قطعی بکنم. ولی می‌تونم بشنوم و همراهیتون کنم:\n\n";

const GROUNDED_SYSTEM_PROMPT = `You are MINDORA, a warm, evidence-conscious
psychological support companion. You are NOT a psychologist, psychiatrist, or
doctor, and you never claim to be. You have been given verified evidence
excerpts below — use ONLY these to ground any factual/clinical claim. Rules
that override everything else:
- NEVER suggest, name, or discuss medication, dosage, or prescriptions.
- NEVER give a diagnosis or say a phrase equivalent to "this is your diagnosis".
- Base factual claims strictly on the evidence provided below — do not add
  outside claims, statistics, or techniques not present in it.
- Respond in the same language the user wrote in (default Persian/Farsi).
- Keep responses concise and warm — a few sentences, not an essay.
- Do not mention "the evidence provided" explicitly; just answer naturally
  as if you know this — the sources will be shown separately to the user.

EVIDENCE:
{{EVIDENCE}}`;

const UNGROUNDED_SYSTEM_PROMPT = `You are MINDORA, a warm, evidence-conscious
psychological support companion. You are NOT a psychologist, psychiatrist, or
doctor, and you never claim to be. Rules that override everything else:
- NEVER suggest, name, or discuss medication, dosage, or prescriptions.
- NEVER give a diagnosis or say a phrase equivalent to "this is your diagnosis".
- NEVER present a specific clinical claim, statistic, or named technique's
  efficacy as fact — no evidence was retrieved for this query.
- Stick to reflective listening, validation, and very general psychoeducation
  without citing sources or making quantified claims.
- Respond in the same language the user wrote in (default Persian/Farsi).
- Keep responses concise and warm — a few sentences, not an essay.`;

export async function runManagerAgent(userMessage: string): Promise<AiResponseContract> {
  const intake = await classifyIntake(userMessage);

  if (!intake.in_scope) {
    return {
      response: OUT_OF_SCOPE_MESSAGE,
      intent: "out_of_scope",
      evidence_required: false,
      evidence_used: [],
      safety_status: "ok",
      medication_detected: false,
      confidence: 1,
      escalation_required: false,
    };
  }

  const evidenceMatches = intake.requires_evidence ? await retrieveEvidence(userMessage) : [];
  const hasEvidence = evidenceMatches.length > 0;

  const systemPrompt = hasEvidence
    ? GROUNDED_SYSTEM_PROMPT.replace(
        "{{EVIDENCE}}",
        evidenceMatches.map((e) => `- [${e.organization}] ${e.title}: ${e.summary}`).join("\n")
      )
    : UNGROUNDED_SYSTEM_PROMPT;

  const rawReply = await chatText({ system: systemPrompt, user: userMessage });

  const outputCheck = validateAiResponse(rawReply);
  const finalResponse = outputCheck.safe
    ? intake.requires_evidence && !hasEvidence
      ? NO_EVIDENCE_ENGINE_PREFIX + rawReply
      : rawReply
    : "متوجه شدم چی می‌گید، ولی نمی‌تونم دقیق‌تر از این درباره‌ی این موضوع نظر بدم. پیشنهاد می‌کنم با یه متخصص روانشناسی یا روان‌پزشکی صحبت کنید.";

  const contract: AiResponseContract = {
    response: finalResponse,
    intent: intake.intent,
    evidence_required: intake.requires_evidence,
    evidence_used: evidenceMatches.map((e) => e.id),
    safety_status: "ok",
    medication_detected: !outputCheck.safe,
    confidence: hasEvidence ? 0.85 : intake.requires_evidence ? 0.4 : 0.7,
    escalation_required: false,
  };

  if (!isValidContract(contract)) {
    return {
      response: "متأسفم، در حال حاضر نمی‌تونم پاسخ مناسبی تولید کنم. لطفاً دوباره امتحان کنید.",
      intent: "validation_failed",
      evidence_required: false,
      evidence_used: [],
      safety_status: "ok",
      medication_detected: false,
      confidence: 0,
      escalation_required: false,
    };
  }

  return contract;
}
