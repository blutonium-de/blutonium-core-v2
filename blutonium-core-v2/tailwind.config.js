/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { blutonium: { 500: "#00E5FF", 700: "#00B8D9" } }
    }
  },
  plugins: [],
};
