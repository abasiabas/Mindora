import "server-only";

const GEMINI_MODEL = "gemini-flash-latest";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

async function callGemini(params: {
  systemInstruction: string;
  userText: string;
  jsonMode?: boolean;
}): Promise<string> {
  const apiKey = requireApiKey();

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: params.userText }] }],
    systemInstruction: { parts: [{ text: params.systemInstruction }] },
    generationConfig: {
      temperature: params.jsonMode ? 0.3 : 0.5,
      ...(params.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini API returned an unexpected response shape");
  }
  return text;
}

export async function chatJSON<T>(params: { system: string; user: string }): Promise<T> {
  const raw = await callGemini({ systemInstruction: params.system, userText: params.user, jsonMode: true });
  return JSON.parse(raw) as T;
}

export async function chatText(params: { system: string; user: string }): Promise<string> {
  return callGemini({ systemInstruction: params.system, userText: params.user, jsonMode: false });
}
