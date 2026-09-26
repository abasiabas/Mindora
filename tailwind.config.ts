import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          primary: "#050A1A",
          secondary: "#081226",
        },
        brand: {
          blue: "#00B4FF",
          cyan: "#008CFF",
          orange: "#FF8C1A",
          gold: "#FFB84A",
        },
        ink: {
          primary: "#F2F8FF",
          secondary: "rgba(220,235,245,0.70)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Vazirmatn", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(0,180,255,0.25)",
        "glow-gold": "0 0 40px rgba(255,184,74,0.25)",
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "pulse-slow": "pulseSlow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
