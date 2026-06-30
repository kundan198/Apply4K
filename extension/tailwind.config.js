/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}", "./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#3b6cff",
          600: "#2a55e6",
          700: "#1f43c4"
        },
        good: "#10b981",
        warn: "#f59e0b",
        bad: "#ef4444",
        ink: "#0b1020",
        panel: "#10162b"
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      boxShadow: {
        glow: "0 10px 40px -12px rgba(59,108,255,0.55)"
      }
    }
  },
  plugins: []
};
