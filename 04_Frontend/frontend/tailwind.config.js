/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f4a8b8',
          400: '#ec7591',
          500: '#df4669',
          600: '#c92850',
          700: '#a91d3f',
          800: '#8b1a36',
          900: '#761933',
          950: '#420817',
          DEFAULT: '#6B0F1A',
          dark: '#4A0A12',
        },
        gold: {
          50: '#fbf8ef',
          100: '#f5eed4',
          200: '#ebdba8',
          300: '#dfc273',
          400: '#d4a843',
          500: '#c8962e',
          600: '#ac7625',
          700: '#8a5820',
          800: '#714720',
          900: '#5f3b1f',
          950: '#361e0e',
          DEFAULT: '#C9A227',
          light: '#E8C547',
        },
        surface: {
          DEFAULT: '#1A1214',
          card: '#24181B',
          elevated: '#2E1F23',
          border: '#3D2A2F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        gold: '0 4px 24px rgba(201, 162, 39, 0.15)',
        card: '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
