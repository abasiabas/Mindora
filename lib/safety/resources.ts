// ============================================================================
// Crisis resources — Iran (verified against behzisti.ir, September 2026).
// These numbers are shown verbatim to users in a crisis state. Do NOT change
// without re-verifying against an official source; wrong numbers here are
// not a bug, they are a safety incident.
// ============================================================================
export const CRISIS_RESOURCES_IR = {
  socialEmergency: {
    number: "123",
    label: "اورژانس اجتماعی بهزیستی",
    description: "رایگان، شبانه‌روزی و محرمانه — برای افکار یا اقدام به خودکشی، بحران‌های خانوادگی و آسیب‌های اجتماعی.",
  },
  counselingLine: {
    number: "1480",
    label: "خط مشاوره بهزیستی",
    description: "مشاوره تلفنی رایگان سازمان بهزیستی.",
  },
  medicalEmergency: {
    number: "115",
    label: "اورژانس پزشکی",
    description: "برای خطر جانی فوری یا اقدام حاد.",
  },
} as const;

export function formatCrisisMessage(): string {
  const r = CRISIS_RESOURCES_IR;
  return [
    "به نظر می‌رسه توی شرایط سختی هستید. من نمی‌تونم جایگزین کمک تخصصی فوری بشم، ولی می‌تونم بگم الان با کی تماس بگیرید:",
    `• ${r.socialEmergency.label}: ${r.socialEmergency.number} — ${r.socialEmergency.description}`,
    `• ${r.counselingLine.label}: ${r.counselingLine.number}`,
    `• ${r.medicalEmergency.label} (در خطر جانی فوری): ${r.medicalEmergency.number}`,
    "اگه الان در خطر فوری هستید یا کسی کنارتونه که بتونه کمک کنه، لطفاً همین حالا باهاش تماس بگیرید.",
  ].join("\n");
}
