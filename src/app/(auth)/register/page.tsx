"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("برای ادامه باید شرایط استفاده و سیاست حریم خصوصی را بپذیرید.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError("ثبت‌نام ناموفق بود. لطفاً دوباره تلاش کنید.");
      return;
    }

    // Record consent — required before any AI usage (bind 73).
    // NOTE: profile row + consent_records insert is finalized server-side
    // in the auth callback once the session exists, to respect RLS.
    if (data.user) setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold text-brand-700">ایمیل تأیید ارسال شد</h1>
        <p className="text-slate-600">
          لطفاً صندوق ایمیل خود را بررسی کنید و روی لینک تأیید کلیک کنید.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-brand-700">ثبت‌نام</h1>

      <form onSubmit={handleRegister} className="flex flex-col gap-3" noValidate>
        <label className="text-sm text-slate-600" htmlFor="email">ایمیل</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />

        <label className="text-sm text-slate-600" htmlFor="password">رمز عبور</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span>
            <a href="/terms" className="text-brand-600 hover:underline">شرایط استفاده</a>{" "}
            و{" "}
            <a href="/privacy" className="text-brand-600 hover:underline">سیاست حریم خصوصی</a>{" "}
            را می‌پذیرم و می‌دانم مایندورا جایگزین روانپزشک، روانشناس یا خدمات اورژانسی نیست.
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-brand-500 py-2 text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
        </button>
      </form>

      <a href="/login" className="text-center text-sm text-brand-600 hover:underline">
        قبلاً حساب دارید؟ ورود
      </a>
    </main>
  );
}
