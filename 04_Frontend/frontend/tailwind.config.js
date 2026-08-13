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
          DEFAULT: 'var(--dhara-bg-secondary)',
          dark: 'var(--dhara-bg-primary)',
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
          DEFAULT: 'var(--dhara-accent)',
          light: 'var(--dhara-accent-soft)',
        },
        surface: {
          DEFAULT: 'var(--dhara-bg-primary)',
          card: 'var(--dhara-surface)',
          elevated: 'var(--dhara-surface-hover)',
          border: 'var(--dhara-border)',
        },
      },
      fontFamily: {
        sans: ['Source Sans 3', 'Noto Sans Gujarati', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Noto Serif Gujarati', 'Georgia', 'serif'],
        gujarati: ['Noto Serif Gujarati', 'Cormorant Garamond', 'serif'],
      },
      boxShadow: {
        gold: '0 8px 28px var(--dhara-glow)',
        card: 'var(--dhara-glass-shadow)',
      },
    },
  },
  plugins: [],
};
