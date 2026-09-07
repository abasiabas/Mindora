import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function chatJSON<T>(params: {
  system: string;
  user: string;
  model?: string;
}): Promise<T> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: params.model ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}

export async function chatText(params: {
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: params.model ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
    temperature: 0.5,
  });
  return completion.choices[0]?.message?.content ?? "";
}
