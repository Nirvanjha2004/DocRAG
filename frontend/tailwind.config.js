/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // Named surface tokens — use these instead of raw hex in components
        base:     "#0B0F14",
        surface:  "#0d1117",
        elevated: "#161b22",
        overlay:  "#1c2333",
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.08)",
      },
      boxShadow: {
        // Glow effects for interactive elements
        "glow-violet": "0 0 0 3px rgba(124,58,237,0.15), 0 4px 16px rgba(124,58,237,0.12)",
        "glow-sm":     "0 0 0 2px rgba(124,58,237,0.12)",
        "card":        "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "elevated":    "0 4px 24px rgba(0,0,0,0.5)",
      },
      animation: {
        "spin-slow": "spin 2s linear infinite",
      },
      // Consistent border radius scale
      borderRadius: {
        "xl":  "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};
