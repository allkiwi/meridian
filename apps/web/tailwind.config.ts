import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0a0f1e",
          50: "#e8eaf2",
          100: "#c5cade",
          200: "#9ea6c8",
          300: "#7782b1",
          400: "#5a669f",
          500: "#3d4a8e",
          600: "#2d3a7e",
          700: "#1e2a6e",
          800: "#121d54",
          900: "#0a0f1e",
        },
        amber: {
          DEFAULT: "#f59e0b",
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["DM Serif Display", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
