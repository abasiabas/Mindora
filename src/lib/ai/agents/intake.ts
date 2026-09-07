import { chatJSON } from "@/lib/ai/openai";

export interface IntakeClassification {
  in_scope: boolean;
  intent: string;
  requires_evidence: boolean;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are the Intake classifier for MINDORA, a psychology support platform.
Classify the user's message. Respond ONLY with JSON matching exactly:
{"in_scope": boolean, "intent": string, "requires_evidence": boolean, "reasoning": string}

"in_scope" = true only if the message is about psychology, mental wellbeing,
psychological assessment, psychotherapy, or behavioral/emotional/cognitive topics.
Small talk that is clearly trying to build rapport before a psychology topic still
counts as in_scope. Topics like weather, sports, coding, recipes, finance = NOT in_scope.

"requires_evidence" = true if a responsible answer would need to cite a specific
clinical claim, statistic, technique efficacy, or diagnostic criterion. General
active-listening / reflective statements do not require evidence.

Never classify medication or diagnosis requests as needing you to answer them —
that is handled by a separate safety layer; just classify accurately.`;

export async function classifyIntake(userMessage: string): Promise<IntakeClassification> {
  const result = await chatJSON<IntakeClassification>({
    system: SYSTEM_PROMPT,
    user: userMessage,
  });

  return {
    in_scope: Boolean(result.in_scope),
    intent: result.intent || "unknown",
    requires_evidence: Boolean(result.requires_evidence),
    reasoning: result.reasoning || "",
  };
}
