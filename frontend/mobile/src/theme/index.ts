import { colors, lightColors, darkColors } from './colors';
import type { AppColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export { colors, lightColors, darkColors, typography, spacing, borderRadius, shadows };
export type { AppColors };

// Re-export useTheme so screens can do:
//   import { useTheme } from '../theme';
export { useTheme } from '../context/ThemeContext';

export default theme;
