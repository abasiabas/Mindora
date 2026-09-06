export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-brand-700">مایندورا</h1>
      <p className="text-lg text-slate-600">
        یک ابزار پشتیبان روانشناختی مبتنی بر شواهد علمی — نه جایگزین روانشناس، روانپزشک،
        پزشک یا خدمات اورژانسی.
      </p>
      <a
        href="/login"
        className="rounded-lg bg-brand-500 px-6 py-3 text-white transition hover:bg-brand-600"
      >
        شروع کنید
      </a>
    </main>
  );
}
