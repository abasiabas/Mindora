import { classifyIntake } from "@/lib/ai/agents/intake";
import { chatText } from "@/lib/ai/gemini";
import { validateAiResponse } from "@/lib/safety";
import type { AiResponseContract } from "@/lib/ai/contract";
import { isValidContract } from "@/lib/ai/contract";

const OUT_OF_SCOPE_MESSAGE =
  "مایندورا فقط می‌تونه درباره‌ی موضوعات روانشناسی، سلامت روان و روان‌درمانی صحبت کنه. اگه چیزی توی این حوزه‌ست، خوشحال می‌شم کمک کنم.";

const NO_EVIDENCE_ENGINE_PREFIX =
  "موتور شواهد علمی مایندورا هنوز کامل نشده، پس نمی‌تونم یه ادعای علمی مشخص با منبع بهتون بدم. ولی می‌تونم بشنوم و همراهیتون کنم:\n\n";

const CONVERSATION_SYSTEM_PROMPT = `You are MINDORA, a warm, evidence-conscious
psychological support companion. You are NOT a psychologist, psychiatrist, or
doctor, and you never claim to be. Rules that override everything else:
- NEVER suggest, name, or discuss medication, dosage, or prescriptions.
- NEVER give a diagnosis or say a phrase equivalent to "this is your diagnosis".
- NEVER present a specific clinical claim, statistic, or named technique's
  efficacy as fact — you have no evidence-retrieval system connected yet.
- Stick to reflective listening, validation, and very general psychoeducation
  without citing sources or making quantified claims.
- If the person seems to want a specific technique or clinical answer, be
  honest that you can't give an evidence-backed answer for that yet, and
  gently suggest a licensed professional for anything beyond general support.
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

  const rawReply = await chatText({
    system: CONVERSATION_SYSTEM_PROMPT,
    user: userMessage,
  });

  const outputCheck = validateAiResponse(rawReply);
  const finalResponse = outputCheck.safe
    ? intake.requires_evidence
      ? NO_EVIDENCE_ENGINE_PREFIX + rawReply
      : rawReply
    : "متوجه شدم چی می‌گید، ولی نمی‌تونم دقیق‌تر از این درباره‌ی این موضوع نظر بدم. پیشنهاد می‌کنم با یه متخصص روانشناسی یا روان‌پزشکی صحبت کنید.";

  const contract: AiResponseContract = {
    response: finalResponse,
    intent: intake.intent,
    evidence_required: intake.requires_evidence,
    evidence_used: [],
    safety_status: "ok",
    medication_detected: !outputCheck.safe,
    confidence: intake.requires_evidence ? 0.4 : 0.7,
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
