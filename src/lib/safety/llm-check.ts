import { chatText } from "@/lib/ai/gemini";

const LLM_SAFETY_PROMPT = `You are a safety classifier for a Persian-language mental health support app.
Read the user's message and decide ONLY whether it indicates a real, current risk of:
- suicide or self-harm (even if expressed indirectly, metaphorically, or as a "joke")
- being a victim of abuse, violence, or coercion by another person

Respond with ONLY this exact JSON and nothing else (no markdown, no explanation):
{"crisis": true} or {"crisis": false}

If you are unsure, respond {"crisis": false} — do not guess toward true.`;

export async function llmSafetyCheck(userMessage: string): Promise<{ crisis: boolean }> {
  try {
    const raw = await chatText({ system: LLM_SAFETY_PROMPT, user: userMessage });
    const match = raw.match(/\{[^{}]*"crisis"[^{}]*\}/);
    if (!match) return { crisis: false };
    const parsed = JSON.parse(match[0]);
    return { crisis: parsed.crisis === true };
  } catch {
    return { crisis: false };
  }
}
