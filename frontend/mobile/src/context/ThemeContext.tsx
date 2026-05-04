import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from '../store';
import { lightColors, darkColors, AppColors } from '../theme/colors';

interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
  themeMode: 'system' | 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  themeMode: 'system',
});

export type { ThemeContextValue };
export { ThemeContext };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useAppSelector((state) => state.settings.themeMode);
  const systemColorScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? (darkColors as unknown as AppColors) : lightColors,
      isDark,
      themeMode,
    }),
    [isDark, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
