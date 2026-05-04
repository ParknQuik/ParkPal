import { useTheme } from '../context/ThemeContext';

/**
 * Returns the correct expo-status-bar `style` prop value based on the active theme.
 * - Dark theme → 'light' (light icons on dark background)
 * - Light theme → 'dark' (dark icons on light background)
 *
 * Usage:
 *   import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
 *   const style = useStatusBarStyle();
 *   return <StatusBar style={style} />;
 */
export function useStatusBarStyle(): 'light' | 'dark' {
  const { isDark } = useTheme();
  return isDark ? 'light' : 'dark';
}
