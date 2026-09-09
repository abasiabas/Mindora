export interface SeverityBand {
  label: string;
  min: number;
  max: number;
}

const PHQ9_BANDS: SeverityBand[] = [
  { label: "نشانه‌های حداقلی", min: 0, max: 4 },
  { label: "نشانه‌های خفیف", min: 5, max: 9 },
  { label: "نشانه‌های متوسط", min: 10, max: 14 },
  { label: "نشانه‌های نسبتاً شدید", min: 15, max: 19 },
  { label: "نشانه‌های شدید", min: 20, max: 27 },
];

const GAD7_BANDS: SeverityBand[] = [
  { label: "نشانه‌های حداقلی", min: 0, max: 4 },
  { label: "نشانه‌های خفیف", min: 5, max: 9 },
  { label: "نشانه‌های متوسط", min: 10, max: 14 },
  { label: "نشانه‌های شدید", min: 15, max: 21 },
];

export function scoreAssessment(
  code: "phq9" | "gad7",
  answers: Record<string, number>
): { score: number; band: SeverityBand; item9Flag: boolean } {
  const score = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const bands = code === "phq9" ? PHQ9_BANDS : GAD7_BANDS;
  const band = bands.find((b) => score >= b.min && score <= b.max) ?? bands[bands.length - 1];

  const item9Flag = code === "phq9" && (answers["9"] ?? 0) > 0;

  return { score, band, item9Flag };
}

export function buildInterpretationNote(code: "phq9" | "gad7", band: SeverityBand): string {
  const instrument = code === "phq9" ? "افسردگی" : "اضطراب";
  return `این نتیجه یک غربالگری خوداظهاری از نشانه‌های ${instrument} در دو هفته‌ی اخیر است (سطح: ${band.label}) و به‌هیچ‌وجه معادل تشخیص بالینی نیست. برای تشخیص و برنامه‌ی درمانی، لطفاً با یک روانشناس یا روان‌پزشک مشورت کنید.`;
}
