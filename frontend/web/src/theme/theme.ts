import { createTheme } from '@mui/material/styles';
import { themeColors } from './colors';

export type ColorMode = 'light' | 'dark';

export function createAppTheme(mode: ColorMode) {
  const dark = mode === 'dark';
  const colors = dark
    ? { canvas: '#111b19', paper: '#1a2824', ink: '#edf3ef', muted: '#b2c2ba', line: '#35463f', appBar: '#17231f', input: '#1a2824' }
    : { canvas: themeColors.canvas, paper: themeColors.paper, ink: themeColors.ink, muted: themeColors.muted, line: themeColors.line, appBar: '#fff', input: '#fff' };

  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? '#75c4a5' : themeColors.primary, dark: dark ? '#4d9b7f' : '#105347', light: dark ? '#b1e1ca' : '#dcefe8', contrastText: dark ? '#10231c' : '#fff' },
      secondary: { main: dark ? '#ef9a6d' : themeColors.secondary, contrastText: dark ? '#24150f' : '#fff' },
      background: { default: colors.canvas, paper: colors.paper },
      text: { primary: colors.ink, secondary: colors.muted },
      divider: colors.line,
      success: { main: dark ? '#73c99d' : '#267458' },
      warning: { main: dark ? '#edb16f' : '#a96220' },
      error: { main: dark ? '#ef8d80' : '#b64337' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: '"DM Sans", "Avenir Next", Avenir, sans-serif',
      h1: { fontSize: 'clamp(2.4rem, 5vw, 4.25rem)', lineHeight: 1.04, fontWeight: 750, letterSpacing: '-0.055em' },
      h2: { fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', lineHeight: 1.12, fontWeight: 700, letterSpacing: '-0.04em' },
      h3: { fontSize: 'clamp(1.6rem, 2.6vw, 2.25rem)', lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.035em' },
      h4: { fontWeight: 700, letterSpacing: '-0.03em' }, h5: { fontWeight: 700, letterSpacing: '-0.025em' }, h6: { fontWeight: 700, letterSpacing: '-0.015em' },
      button: { fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'none' }, body1: { lineHeight: 1.65 },
    },
    components: {
      MuiCssBaseline: { styleOverrides: {
        html: { colorScheme: mode },
        body: { backgroundColor: colors.canvas },
        '::selection': { background: dark ? '#315b49' : '#c8e3d8', color: colors.ink },
        ':focus-visible': { outline: '3px solid #df966e', outlineOffset: 3 },
        a: { textUnderlineOffset: '3px' },
        '@media (prefers-reduced-motion: reduce)': { '*, *::before, *::after': { scrollBehavior: 'auto !important', animationDuration: '0.01ms !important', animationIterationCount: '1 !important', transitionDuration: '0.01ms !important' } },
      } },
      MuiAppBar: { styleOverrides: { root: { backgroundColor: colors.appBar, color: colors.ink, boxShadow: dark ? '0 1px 0 rgba(0,0,0,.28)' : '0 1px 0 rgba(24,42,40,.08)', borderBottom: `1px solid ${colors.line}` } } },
      MuiToolbar: { styleOverrides: { root: { minHeight: '72px !important', paddingLeft: 'max(24px, calc((100vw - 1200px) / 2)) !important', paddingRight: 'max(24px, calc((100vw - 1200px) / 2)) !important' } } },
      MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 10, paddingInline: 18, boxShadow: 'none', transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease', '&:hover': { boxShadow: '0 7px 18px rgba(23,107,91,.15)', transform: 'translateY(-1px)' }, '&:active': { transform: 'translateY(0)' } }, contained: { '&:hover': { boxShadow: '0 8px 20px rgba(23,107,91,.22)' } } } },
      MuiCard: { styleOverrides: { root: { border: `1px solid ${colors.line}`, borderRadius: 16, boxShadow: dark ? '0 5px 18px rgba(0,0,0,.16)' : '0 5px 18px rgba(29,52,45,.045)', backgroundImage: 'none' } } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 16 }, elevation3: { boxShadow: dark ? '0 16px 45px rgba(0,0,0,.3)' : '0 16px 45px rgba(29,52,45,.09)' } } },
      MuiTextField: { defaultProps: { variant: 'outlined' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: colors.input, '& fieldset': { borderColor: colors.line }, '&:hover fieldset': { borderColor: dark ? '#688e7c' : '#97b8aa' }, '&.Mui-focused fieldset': { borderWidth: 2 } } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 600 }, clickable: { transition: 'background-color 150ms ease, transform 150ms ease', '&:hover': { transform: 'translateY(-1px)' } } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: 'center' } } },
    },
  });
}
