/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        pipe: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          900: "#0c4a6e",
        },
        rust: {
          400: "#f97316",
          500: "#ea580c",
          600: "#c2410c",
        },
        slate: {
          850: "#1a2332",
          950: "#0d1520",
        },
      },
    },
  },
  plugins: [],
};
