/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        blutonium: { 500: '#8a2be2', 400: '#9d4edd', 300: '#b07dfb' },
        techno: { 1: '#0d0d0d', 2: '#1a1a1a' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(138, 43, 226, 0.5)',
      },
    },
  },
  plugins: [],
};