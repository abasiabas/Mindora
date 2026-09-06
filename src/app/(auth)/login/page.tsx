"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Never leak whether the account exists — generic message only.
      setError("ایمیل یا رمز عبور نادرست است.");
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-brand-700">ورود</h1>

      <form onSubmit={handleEmailLogin} className="flex flex-col gap-3" noValidate>
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-brand-500 py-2 text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>

      <button
        onClick={handleGoogleLogin}
        className="rounded-md border border-slate-300 py-2 text-slate-700 transition hover:bg-slate-50"
      >
        ورود با گوگل
      </button>

      <div className="flex justify-between text-sm">
        <a href="/register" className="text-brand-600 hover:underline">ثبت‌نام</a>
        <a href="/forgot-password" className="text-brand-600 hover:underline">فراموشی رمز عبور</a>
      </div>
    </main>
  );
}
