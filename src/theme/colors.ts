/**
 * Design Tokens - Color Palette
 * StockBaller Brand Theme - Matching stockballer.app
 */

export const colors = {
  // Primary Brand Colors (StockBaller Blue)
  primary: {
    50: '#E8EBFF',
    100: '#C9D1FE',
    200: '#9AA8FD',
    300: '#6B7FFB',
    400: '#3C56F9',
    500: '#0528F3', // Main Primary - StockBaller Blue
    600: '#0420D0',
    700: '#0319AD',
    800: '#02128A',
    900: '#010B67',
  },

  // Background Colors (StockBaller Navy)
  background: {
    primary: '#0D2758',    // Deep navy - main bg
    secondary: '#132D5E',  // Slightly lighter navy
    tertiary: '#1A3A6E',   // Lighter navy for hover
    elevated: '#132D5E',   // Card/modal backgrounds
  },

  // Surface Colors
  surface: {
    100: '#132D5E',
    200: '#1A3A6E',
    300: '#244680',
    400: '#2E5292',
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',    // White - headings
    secondary: 'rgba(255, 255, 255, 0.7)',  // Muted - body text
    tertiary: 'rgba(255, 255, 255, 0.5)',   // Even more muted
    inverse: '#0D2758',    // Dark text on light bg
  },

  // Accent Colors (Golden Yellow CTA)
  accent: {
    gold: '#F5CB3F',       // Main CTA color
    goldLight: '#FFE066',
    goldDark: '#D4A830',
  },

  // Status Colors
  success: {
    light: '#34D399',
    main: '#10B981',
    dark: '#059669',
  },

  warning: {
    light: '#FBBF24',
    main: '#F59E0B',
    dark: '#D97706',
  },

  danger: {
    light: '#FF6B6B',
    main: '#FF1744',
    dark: '#DC2626',
  },

  // Trading Specific
  trading: {
    bullish: '#10B981',    // Green - price up
    bearish: '#FF1744',    // Red - price down
    neutral: '#64748B',    // Gray - no change
    volume: '#8B5CF6',     // Purple - volume indicator
  },

  // Chart Colors
  chart: {
    line: '#0528F3',
    area: 'rgba(5, 40, 243, 0.2)',
    grid: 'rgba(255, 255, 255, 0.1)',
    tooltip: '#132D5E',
  },

  // Border Colors
  border: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    strong: 'rgba(255, 255, 255, 0.3)',
  },
} as const;

export type ColorPalette = typeof colors;
