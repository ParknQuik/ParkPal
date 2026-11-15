import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme, type ColorMode } from './theme';

export type ThemePreference = 'system' | ColorMode;
const storageKey = 'parknquik-theme-mode';
interface ThemeModeContextValue { preference: ThemePreference; setPreference: (value: ThemePreference) => void }
const ThemeModeContext = createContext<ThemeModeContextValue>({ preference: 'system', setPreference: () => undefined });

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* use the system preference when storage is unavailable */ }
  return 'system';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystemDark(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  const setPreference = (next: ThemePreference) => {
    try { window.localStorage.setItem(storageKey, next); } catch { /* keep the choice for this session */ }
    setPreferenceState(next);
  };
  const mode: ColorMode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const context = useMemo(() => ({ preference, setPreference }), [preference]);
  return <ThemeModeContext.Provider value={context}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></ThemeModeContext.Provider>;
}

export function useThemeMode() { return useContext(ThemeModeContext); }
