/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#001f4d',
          800: '#002966',
          700: '#003380',
          600: '#003d99',
          DEFAULT: '#003366',
          100: '#e6ecf5',
          50:  '#f0f4fa',
        },
      },
    },
  },
  plugins: [],
};
