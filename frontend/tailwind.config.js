/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'sfu-red': '#A6192E',
        'dark-bg': '#1a1a1a',
        'dark-card': '#2d2d2d',
        'dark-card-hover': '#3a3a3a',
        'lecture-purple': '#5B2C6F',
        'lab-green': '#00703c',
        'accent-blue': '#4A90E2',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
