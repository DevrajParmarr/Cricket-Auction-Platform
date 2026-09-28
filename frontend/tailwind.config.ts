import type { Config } from "tailwindcss";

// Spring-ish overshoot for "impact" moments, smooth decel for entrances
const spring = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const decel = "cubic-bezier(0.22, 1, 0.36, 1)";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef3c7",
          100: "#fde68a",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          900: "#78350f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "bid-pop": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.09)" },
          "100%": { transform: "scale(1)" },
        },
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "15%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-32px)" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(2.4) rotate(-20deg)" },
          "60%": { opacity: "1", transform: "scale(0.92) rotate(-10deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-12deg)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "card-in": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        sheen: {
          "0%": { transform: "translateX(-150%) skewX(-20deg)" },
          "100%": { transform: "translateX(250%) skewX(-20deg)" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.07)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.9" },
        },
        "confetti-fall": {
          "0%": { opacity: "1", transform: "translate3d(0, -20px, 0) rotate(0deg)" },
          "100%": { opacity: "0", transform: "translate3d(var(--drift, 0px), 260px, 0) rotate(var(--spin, 540deg))" },
        },
      },
      animation: {
        "bid-pop": `bid-pop 450ms ${spring}`,
        "float-up": "float-up 1.4s ease-out forwards",
        "stamp-in": `stamp-in 550ms ${spring} both`,
        // "backwards" (not "both") so hover transforms still apply once the entrance ends
        "fade-up": `fade-up 320ms ${decel} backwards`,
        "card-in": `card-in 480ms ${decel} both`,
        "spin-slow": "spin 6s linear infinite",
        sheen: "sheen 1.1s ease-out",
        heartbeat: "heartbeat 1s ease-in-out infinite",
        "glow-pulse": "glow-pulse 1s ease-in-out infinite",
        "confetti-fall": "confetti-fall 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
