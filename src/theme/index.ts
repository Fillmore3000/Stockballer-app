/**
 * Design Tokens - Central Export
 */

export { colors } from './colors';
export type { ColorPalette } from './colors';

export { spacing, layout } from './spacing';
export type { Spacing } from './spacing';

export { fontSizes, fontWeights, lineHeights, textStyles } from './typography';
export type { TextStyle } from './typography';

export { borderRadius } from './borderRadius';
export type { BorderRadius } from './borderRadius';

export { shadows } from './shadows';
export type { Shadow } from './shadows';

// Theme object for convenience
import { colors } from './colors';
import { spacing, layout } from './spacing';
import { fontSizes, fontWeights, lineHeights, textStyles } from './typography';
import { borderRadius } from './borderRadius';
import { shadows } from './shadows';

export const theme = {
  colors,
  spacing,
  layout,
  fontSizes,
  fontWeights,
  lineHeights,
  textStyles,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
