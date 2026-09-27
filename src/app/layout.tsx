import type { Metadata } from "next";
import "./globals.css";
import NeuralField from "../components/neural/NeuralField";

export const metadata: Metadata = {
  title: "ZharfaMind — روان‌شناس هوشمند",
  description:
    "پلتفرم هوش مصنوعی روان‌شناسی و روان‌درمانی مبتنی بر شواهد علمی، برای بهبود سلامت روانی و خودشناسی بهتر.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-background-primary font-sans text-ink-primary antialiased">
        <NeuralField />
        {children}
      </body>
    </html>
  );
}
