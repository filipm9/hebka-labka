/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary peachy-coral palette
        peach: {
          50: '#fef7f4',
          100: '#feeee8',
          200: '#fdd9cc',
          300: '#fbc0a8',
          400: '#f9a07d',
          500: '#f58055',
          600: '#e8693e',
          700: '#c45432',
          800: '#9f452c',
          900: '#833c28',
        },
        // Warm neutral beige
        sand: {
          50: '#faf9f7',
          100: '#f5f3ef',
          200: '#ebe6de',
          300: '#ddd4c6',
          400: '#c9baa5',
          500: '#b5a087',
          600: '#a08a6e',
          700: '#86715a',
          800: '#6e5d4c',
          900: '#5b4e41',
        },
        // Keep old names as aliases for compatibility
        blush: {
          50: '#fef7f4',
          100: '#feeee8',
          200: '#fdd9cc',
          300: '#fbc0a8',
          400: '#f9a07d',
          500: '#f58055',
          600: '#e8693e',
          700: '#c45432',
          800: '#9f452c',
          900: '#833c28',
        },
        beige: {
          50: '#faf9f7',
          100: '#f5f3ef',
          200: '#ebe6de',
          300: '#ddd4c6',
          400: '#c9baa5',
          500: '#b5a087',
          600: '#a08a6e',
          700: '#86715a',
          800: '#6e5d4c',
          900: '#5b4e41',
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

