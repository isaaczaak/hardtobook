import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm true-black background and off-white text.
        ink: "#0B0A09",
        paper: "#F5F2EE",
        // The single accent — reserved for live / urgent states only.
        rose: "#E5484D",
      },
      fontFamily: {
        // Editorial serif for the wordmark.
        serif: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      letterSpacing: {
        micro: "0.08em",
      },
      keyframes: {
        "pulse-rose": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        // Subtle, slow — nothing bouncy.
        "pulse-rose": "pulse-rose 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
