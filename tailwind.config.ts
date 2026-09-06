import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Calm, trustworthy palette — refine later with design skill.
        brand: {
          50: "#f4f7f6",
          100: "#e6efec",
          500: "#3f7d6e",
          600: "#336459",
          700: "#284f47",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Vazirmatn", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
