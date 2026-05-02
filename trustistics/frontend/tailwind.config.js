/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f9',
          100: '#fce7f5',
          200: '#fad0ec',
          300: '#f7a9da',
          400: '#f074bf',
          500: '#e34ba1',
          600: '#ab2b89', // Main solid color
          700: '#a82370',
          800: '#8b205d',
          900: '#751f50',
          950: '#480b2d',
        },
        teal: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fad0e7',
          300: '#f7a9d3',
          400: '#f074b1',
          500: '#871364',
          600: '#871364',
          700: '#871364',
          800: '#871364',
          900: '#711354',
          950: '#450630',
        },
      }
    },
  },
  plugins: [],
}
