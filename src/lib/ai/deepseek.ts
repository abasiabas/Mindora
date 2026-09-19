import "server-only";

const DEEPSEEK_MODEL = "deepseek-flash";
const BASE_URL = "https://api.deepseek.com/chat/completions";

function requireApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
  return key;
}

async function callDeepSeek(params: {
  systemInstruction: string;
  userText: string;
  jsonMode?: boolean;
}): Promise<string> {
  const apiKey = requireApiKey();

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: params.systemInstruction },
      { role: "user", content: params.userText },
    ],
    temperature: params.jsonMode ? 0.3 : 0.5,
    ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  const MAX_ATTEMPTS = 3;
  const RETRY_DELAYS_MS = [1000, 2000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string") {
        throw new Error("DeepSeek API returned an unexpected response shape");
      }
      return text;
    }

    const errText = await res.text().catch(() => "");
    lastError = new Error(`DeepSeek API error (${res.status}): ${errText}`);

    const isRetryable = res.status === 503;
    const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
    if (!isRetryable || isLastAttempt) {
      throw lastError;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }

  throw lastError ?? new Error("DeepSeek API call failed");
}

export async function chatJSON<T>(params: { system: string; user: string }): Promise<T> {
  const raw = await callDeepSeek({ systemInstruction: params.system, userText: params.user, jsonMode: true });
  return JSON.parse(raw) as T;
}

export async function chatText(params: { system: string; user: string }): Promise<string> {
  return callDeepSeek({ systemInstruction: params.system, userText: params.user, jsonMode: false });
}
