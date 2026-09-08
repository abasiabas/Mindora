"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  status?: string;
  evidenceRequired?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, conversationId }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setError("سقف پیام روزانه‌ی پلن شما تموم شده. فردا دوباره امتحان کنید یا پلن خودتون رو ارتقا بدید.");
        setLoading(false);
        return;
      }

      if (!res.ok && res.status !== 503) {
        setError(data?.message || "خطایی رخ داد.");
        setLoading(false);
        return;
      }

      if (data.conversationId) setConversationId(data.conversationId);
      if (typeof data.remaining === "number") setRemaining(data.remaining);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          status: data.status,
          evidenceRequired: data.evidenceRequired,
        },
      ]);
    } catch {
      setError("اتصال برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-700">گفتگو با مایندورا</h1>
        {remaining !== null && (
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700">
            {remaining} پیام باقی‌مانده
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            چیزی که می‌خواید درباره‌ش صحبت کنید رو بنویسید.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
              {m.role === "assistant" && m.status === "escalated" && (
                <p className="mt-2 text-xs font-medium text-red-600">⚠ وضعیت بحرانی — لطفاً با شماره‌های بالا تماس بگیرید</p>
              )}
              {m.role === "assistant" && m.evidenceRequired && (
                <p className="mt-2 text-xs text-amber-600">این بخش هنوز مبتنی بر منبع علمی مشخص نیست</p>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-center text-xs text-slate-400">در حال نوشتن...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="پیام خود را بنویسید..."
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-brand-500 px-5 py-2 text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          ارسال
        </button>
      </form>
    </main>
  );
}
