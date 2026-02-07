// tailwind.config.js
// Tailwind CSS configuration for VoiceCast Studio.
// Dark theme with slate/amber color scheme, custom fonts and animations.

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Noto Sans JP'", "'Segoe UI'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        slideIn: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "slide-in": "slideIn 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
