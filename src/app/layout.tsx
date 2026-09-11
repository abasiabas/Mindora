import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZharfaMind — روانشناس جیبی",
  description: "پلتفرم پشتیبان روانشناختی مبتنی بر شواهد علمی. جایگزین روانشناس، روانپزشک یا خدمات اورژانسی نیست.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-brand-50 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
