/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        "kmkt-display": ['"Playfair Display"', "Georgia", "serif"],
        "kmkt-sans": ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "kmkt-pwa-backdrop": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "kmkt-pwa-panel": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "kmkt-fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "kmkt-pwa-backdrop": "kmkt-pwa-backdrop 0.22s ease-out forwards",
        "kmkt-pwa-panel": "kmkt-pwa-panel 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "kmkt-fade-up": "kmkt-fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
