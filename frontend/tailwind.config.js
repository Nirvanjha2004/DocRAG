/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        cloud: "0 30px 80px rgba(15, 23, 42, 0.12)",
        soft: "0 8px 30px rgba(15, 23, 42, 0.08)",
      },
      colors: {
        slateMist: "#e8eef9",
      },
      borderRadius: {
        xl2: "24px",
      },
    },
  },
  plugins: [],
};
