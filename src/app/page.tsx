import Link from "next/link";
import NeuralField from "../components/neural/NeuralField";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background-primary text-ink-primary">
      <NeuralField />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="text-lg font-bold tracking-wide">
          <span className="text-brand-blue">ظرفا</span>{" "}
          <span className="text-brand-gold">مایند</span>
        </span>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-brand-blue/40 px-5 py-2 text-sm text-ink-primary transition hover:border-brand-blue"
          >
            ورود
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-brand-blue px-5 py-2 text-sm font-medium text-background-primary transition hover:bg-brand-cyan"
          >
            ثبت‌نام
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-28 pt-20 text-center md:pt-32">
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          به <span className="text-brand-orange">ظرفا مایند</span> خوش آمدید
        </h1>
        <p className="max-w-xl text-base text-ink-secondary md:text-lg">
          دستیار هوشمند روان‌شناسی مبتنی بر شواهد علمی؛ برای شناخت بهتر خود،
          پیگیری روند و دریافت راهنمایی شخصی‌سازی‌شده.
        </p>
        <Link
          href="/register"
          className="rounded-full bg-gradient-to-l from-brand-blue to-brand-cyan px-8 py-3 text-base font-medium text-background-primary shadow-glow transition hover:opacity-90"
        >
          شروع کنید
        </Link>
      </section>
    </main>
  );
}
