/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blush: {
          50: '#fef2f2',
          100: '#fde8e8',
          200: '#fcd4d4',
          300: '#fab3b3',
          400: '#f78787',
          500: '#f06b6b',
          600: '#e04a4a',
          700: '#c93a3a',
          800: '#a53030',
          900: '#882c2c',
        },
        beige: {
          50: '#faf8f6',
          100: '#f5f1ec',
          200: '#ebe2d6',
          300: '#dccdb8',
          400: '#c9b59a',
          500: '#b89d7f',
          600: '#a6896b',
          700: '#8a7159',
          800: '#725e4c',
          900: '#5f4f42',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e6ede6',
          200: '#cedace',
          300: '#aabfaa',
          400: '#7f9f7f',
          500: '#5d7f5d',
          600: '#4a664a',
          700: '#3d523d',
          800: '#344434',
          900: '#2d392d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
};

