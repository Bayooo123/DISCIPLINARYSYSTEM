/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#7B1C1C',
          dark:    '#5A1010',
          deep:    '#3D0A0A',
          mid:     '#A02020',
          50:      '#fdf3f3',
          100:     '#f7dcdc',
          200:     '#efb5b5',
          300:     '#e38080',
          400:     '#d44e4e',
          500:     '#c42525',
          600:     '#a81a1a',
          700:     '#7B1C1C',
          800:     '#5A1010',
          900:     '#3D0A0A',
        },
        gold: {
          DEFAULT: '#C9930A',
          bright:  '#E8B830',
          pale:    '#FDF6DC',
          50:      '#fefbe8',
          100:     '#fdf3c2',
          200:     '#fbe484',
          300:     '#f8ce3e',
          400:     '#f5b91a',
          500:     '#C9930A',
          600:     '#a67508',
          700:     '#7d5506',
          800:     '#5b3c07',
          900:     '#3a2504',
        },
        cream: {
          DEFAULT: '#FAF7F2',
          2:       '#F2EDE4',
        },
        border:  '#E0D8CC',
        ink:     '#1C1410',
        muted:   '#8A7F74',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

