/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Background Colors (StockBaller Navy)
        background: {
          primary: '#0D2758',
          secondary: '#132D5E',
          tertiary: '#1A3A6E',
          elevated: '#132D5E',
        },
        // Surface Colors
        surface: {
          100: '#132D5E',
          200: '#1A3A6E',
          300: '#244680',
          400: '#2E5292',
        },
        // Primary Brand Colors (StockBaller Blue)
        primary: {
          50: '#E8EBFF',
          100: '#C9D1FE',
          200: '#9AA8FD',
          300: '#6B7FFB',
          400: '#3C56F9',
          500: '#0528F3',
          600: '#0420D0',
          700: '#0319AD',
          800: '#02128A',
          900: '#010B67',
          DEFAULT: '#0528F3',
        },
        // Accent Colors (Golden Yellow CTA)
        accent: {
          gold: '#F5CB3F',
          goldLight: '#FFE066',
          goldDark: '#D4A830',
          DEFAULT: '#F5CB3F',
        },
        // Status Colors
        success: {
          light: '#34D399',
          main: '#10B981',
          dark: '#059669',
          DEFAULT: '#10B981',
        },
        danger: {
          light: '#FF6B6B',
          main: '#FF1744',
          dark: '#DC2626',
          DEFAULT: '#FF1744',
        },
        warning: {
          light: '#FBBF24',
          main: '#F59E0B',
          dark: '#D97706',
          DEFAULT: '#F97316',
        },
        // Text Colors
        text: {
          primary: '#FFFFFF',
          secondary: 'rgba(255, 255, 255, 0.7)',
          tertiary: 'rgba(255, 255, 255, 0.5)',
          inverse: '#0D2758',
        },
        // Border Colors
        border: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.2)',
          strong: 'rgba(255, 255, 255, 0.3)',
          gold: '#F5CB3F',
          primary: 'rgba(245, 203, 63, 0.3)',
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
        },
        // Trading Colors
        trading: {
          bullish: '#10B981',
          bearish: '#FF1744',
          neutral: '#64748B',
        },
      },
    },
  },
  plugins: [],
};
