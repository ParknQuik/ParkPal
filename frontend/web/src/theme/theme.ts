import { createTheme } from '@mui/material/styles';
import { themeColors } from './colors';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: themeColors.primary, dark: '#105347', light: '#dcefe8', contrastText: '#fff' },
    secondary: { main: themeColors.secondary, contrastText: '#fff' },
    background: { default: themeColors.canvas, paper: themeColors.paper },
    text: { primary: themeColors.ink, secondary: themeColors.muted },
    divider: themeColors.line,
    success: { main: '#267458' },
    warning: { main: '#a96220' },
    error: { main: '#b64337' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"DM Sans", "Avenir Next", Avenir, sans-serif',
    h1: { fontSize: 'clamp(2.4rem, 5vw, 4.25rem)', lineHeight: 1.04, fontWeight: 750, letterSpacing: '-0.055em', color: themeColors.ink },
    h2: { fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', lineHeight: 1.12, fontWeight: 700, letterSpacing: '-0.04em' },
    h3: { fontSize: 'clamp(1.6rem, 2.6vw, 2.25rem)', lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.035em' },
    h4: { fontWeight: 700, letterSpacing: '-0.03em' },
    h5: { fontWeight: 700, letterSpacing: '-0.025em' },
    h6: { fontWeight: 700, letterSpacing: '-0.015em' },
    button: { fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'none' },
    body1: { lineHeight: 1.65 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: {
      body: { backgroundColor: themeColors.canvas },
      '::selection': { background: '#c8e3d8', color: themeColors.ink },
      ':focus-visible': { outline: '3px solid #df966e', outlineOffset: 3 },
      'a': { textUnderlineOffset: '3px' },
      '@media (prefers-reduced-motion: reduce)': { '*, *::before, *::after': { scrollBehavior: 'auto !important', animationDuration: '0.01ms !important', animationIterationCount: '1 !important', transitionDuration: '0.01ms !important' } },
    } },
    MuiAppBar: { styleOverrides: { root: { backgroundColor: '#fff', color: themeColors.ink, boxShadow: '0 1px 0 rgba(24,42,40,.08)', borderBottom: `1px solid ${themeColors.line}` } } },
    MuiToolbar: { styleOverrides: { root: { minHeight: '72px !important', paddingLeft: 'max(24px, calc((100vw - 1200px) / 2)) !important', paddingRight: 'max(24px, calc((100vw - 1200px) / 2)) !important' } } },
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 10, paddingInline: 18, boxShadow: 'none', transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease', '&:hover': { boxShadow: '0 7px 18px rgba(23,107,91,.15)', transform: 'translateY(-1px)' }, '&:active': { transform: 'translateY(0)' } }, contained: { '&:hover': { boxShadow: '0 8px 20px rgba(23,107,91,.22)' } } } },
    MuiCard: { styleOverrides: { root: { border: `1px solid ${themeColors.line}`, borderRadius: 16, boxShadow: '0 5px 18px rgba(29,52,45,.045)', backgroundImage: 'none' } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 16 }, elevation3: { boxShadow: '0 16px 45px rgba(29,52,45,.09)' } } },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: '#fff', '& fieldset': { borderColor: themeColors.line }, '&:hover fieldset': { borderColor: '#97b8aa' }, '&.Mui-focused fieldset': { borderWidth: 2 } } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 600 }, clickable: { transition: 'background-color 150ms ease, transform 150ms ease', '&:hover': { transform: 'translateY(-1px)' } } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: 'center' } } },
  },
});

export default theme;
