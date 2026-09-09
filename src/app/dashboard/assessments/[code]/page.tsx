"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Question {
  order_index: number;
  question_text: string;
  options: { label: string; value: number }[];
}

interface ResultState {
  score: number;
  band: string;
  interpretationNote: string;
  crisisMessage: string | null;
}

export default function TakeAssessmentPage({ params }: { params: { code: string } }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: assessment } = await supabase
        .from("assessments")
        .select("id")
        .eq("code", params.code)
        .single();
      if (!assessment) {
        setError("این ارزیابی پیدا نشد.");
        setLoading(false);
        return;
      }
      const { data: qs } = await supabase
        .from("assessment_questions")
        .select("order_index, question_text, options")
        .eq("assessment_id", assessment.id)
        .order("order_index");
      setQuestions((qs ?? []) as Question[]);
      setLoading(false);
    }
    load();
  }, [params.code]);

  async function handleSubmit() {
    if (Object.keys(answers).length !== questions.length) {
      setError("لطفاً به همه‌ی سؤال‌ها پاسخ بدید.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: params.code, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "خطایی رخ داد.");
        setSubmitting(false);
        return;
      }
      setResult(data);
    } catch {
      setError("اتصال برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-8 text-center text-slate-400">در حال بارگذاری...</p>;

  if (result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-6 py-16">
        <h1 className="text-xl font-semibold text-brand-700">نتیجه</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">نمره</p>
          <p className="text-2xl font-bold text-brand-700">{result.score}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{result.band}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{result.interpretationNote}</p>
        </div>
        {result.crisisMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-5">
            <p className="whitespace-pre-line text-sm leading-relaxed text-red-700">{result.crisisMessage}</p>
          </div>
        )}
        <a href="/dashboard/assessments" className="text-center text-sm text-brand-600 hover:underline">
          بازگشت به ارزیابی‌ها
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-12">
      <h1 className="text-xl font-semibold text-brand-700">
        {params.code === "phq9" ? "PHQ-9" : "GAD-7"}
      </h1>
      <p className="text-sm text-slate-500">در دو هفته‌ی اخیر، چقدر با موارد زیر مواجه بوده‌اید؟</p>

      <div className="flex flex-col gap-5">
        {questions.map((q) => (
          <div key={q.order_index} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-medium text-slate-800">
              {q.order_index}. {q.question_text}
            </p>
            <div className="flex flex-col gap-2">
              {q.options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    name={`q-${q.order_index}`}
                    checked={answers[q.order_index] === opt.value}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.order_index]: opt.value }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-lg bg-brand-500 py-3 text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {submitting ? "در حال ارسال..." : "ثبت پاسخ‌ها"}
      </button>
    </main>
  );
}
