import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f0f",
        card: "#1a1a1a",
        border: "#2a2a2a",
        "text-base": "#e5e5e5",
        "text-muted": "#737373",
        advocate: "#22c55e",
        devil: "#ef4444",
        judge: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "#2a2a2a",
      },
    },
  },
  plugins: [],
}

export default config
