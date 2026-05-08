/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kmtNavy: "#081f53",
        kmtBlue: "#1e56c0",
        kmtGold: "#d3a844",
        kmtIvory: "#f8f3e8",
      },
      boxShadow: {
        glow: "0 0 35px rgba(30,86,192,0.4)",
      },
    },
  },
  plugins: [],
};
