/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Noto Sans Thai", "system-ui", "sans-serif"],
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom, 0px)",
        "safe-t": "env(safe-area-inset-top, 0px)",
      },
    },
  },
  plugins: [],
};
