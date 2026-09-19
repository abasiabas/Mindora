import { chatJSON } from "@/lib/ai/deepseek";
import type { IntakeClassification } from "@/lib/ai/agents/intake";

export interface ClarificationCheck {
  needs_clarification: boolean;
  question: string;
}

const SYSTEM_PROMPT = `You are the Dynamic Questioning module for ZharfaMind, a psychology support platform.

Decide whether the assistant has enough information to give a safe, useful, evidence-based response right now, or whether it should first ask ONE short clarifying question.

Ask a clarifying question ONLY when the user's message is genuinely ambiguous or under-specified for a personal/relational/emotional situation AND a clarifying question would meaningfully change what a responsible answer should say (e.g. "my relationship has become cold, what should I do?" needs: duration, mutual vs one-sided, recent triggering event, whether both partners want to improve it).

Do NOT ask a clarifying question when:
- The message is a general statement of feeling (e.g. "I feel stressed and anxious") that can be answered with empathetic listening.
- The message is a factual/informational question (e.g. "what evidence-based treatments exist for anxiety?").
- Enough context already exists in the conversation history to answer well.
- The topic is out of scope, a crisis, or involves medication (those are handled elsewhere).
- You already asked a clarifying question earlier in this conversation and the user just answered it — move forward with an answer instead of asking another one, unless something still genuinely essential is missing.

Respond ONLY with JSON matching exactly:
{"needs_clarification": boolean, "question": string}

If needs_clarification is false, question must be an empty string.
If true, question must be ONE short, specific, warm question in the same language the user is writing in (default Persian/Farsi) — never a list of multiple questions.`;

export async function checkClarificationNeed(
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  intake: IntakeClassification
): Promise<ClarificationCheck> {
  if (!intake.in_scope) {
    return { needs_clarification: false, question: "" };
  }

  const transcript = history
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const user = transcript
    ? `Conversation so far:\n${transcript}\n\nLatest user message: ${userMessage}`
    : `Latest user message: ${userMessage}`;

  const result = await chatJSON<ClarificationCheck>({
    system: SYSTEM_PROMPT,
    user,
  });

  return {
    needs_clarification: Boolean(result.needs_clarification),
    question: result.question || "",
  };
}
