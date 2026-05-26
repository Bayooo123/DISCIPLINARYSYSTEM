/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7B1C1C',
          50:  '#fdf3f3',
          100: '#f7dcdc',
          200: '#efb5b5',
          300: '#e38080',
          400: '#d44e4e',
          500: '#c42525',
          600: '#a81a1a',
          700: '#7B1C1C',
          800: '#5c1414',
          900: '#3a0d0d',
        },
        gold: {
          DEFAULT: '#C9930A',
          50:  '#fefbe8',
          100: '#fdf3c2',
          200: '#fbe484',
          300: '#f8ce3e',
          400: '#f5b91a',
          500: '#C9930A',
          600: '#a67508',
          700: '#7d5506',
          800: '#5b3c07',
          900: '#3a2504',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
