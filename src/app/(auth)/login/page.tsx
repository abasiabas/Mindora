"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("برای ادامه باید شرایط استفاده و سیاست حریم خصوصی را بپذیرید.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) {
      setError("ارسال کد ناموفق بود. لطفاً دوباره تلاش کنید.");
      return;
    }
    setStep("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setLoading(false);
    if (error) {
      setError("کد وارد شده نادرست یا منقضی‌شده است.");
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

  if (step === "code") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold text-brand-700">کد تأیید</h1>
        <p className="text-sm text-slate-500">
          یه کد ۶ رقمی به <span className="font-medium">{email}</span> فرستاده شد.
        </p>

        <form onSubmit={handleVerifyCode} className="flex flex-col gap-3" noValidate>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            required
            autoFocus
            placeholder="کد را وارد کنید"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="rounded-md border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.5em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="mt-2 rounded-md bg-brand-500 py-2 text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "در حال بررسی..." : "تأیید و ورود"}
          </button>
        </form>

        <button
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="text-sm text-brand-600 hover:underline"
        >
          تغییر ایمیل
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-brand-700">ورود / ثبت‌نام</h1>

      <form onSubmit={handleSendCode} className="flex flex-col gap-3" noValidate>
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
            را می‌پذیرم و می‌دانم ژرفا مایند جایگزین روانپزشک، روانشناس یا خدمات اورژانسی نیست.
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-brand-500 py-2 text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "در حال ارسال..." : "دریافت کد ورود"}
        </button>
      </form>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        یا
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        onClick={handleGoogleLogin}
        className="rounded-md border border-slate-300 py-2 text-slate-700 transition hover:bg-slate-50"
      >
        ورود با گوگل
      </button>
    </main>
  );
}
