import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { AuthProvider } from '../../contexts/AuthContext';
import { NavBar } from '../../components/NavBar';
import { createAppTheme } from '../theme';
import { ThemeModeProvider } from '../ThemeModeProvider';

function PaletteProbe() {
  const theme = useTheme();
  return <output data-testid="palette-mode">{theme.palette.mode}</output>;
}

function renderThemeApp() {
  return render(<BrowserRouter><ThemeModeProvider><AuthProvider><NavBar /></AuthProvider><PaletteProbe /></ThemeModeProvider></BrowserRouter>);
}

describe('theme preference', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to system mode and follows the device preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    renderThemeApp();
    expect(screen.getByRole('combobox', { name: 'Color theme' })).toHaveTextContent('System');
    expect(screen.getByTestId('palette-mode')).toHaveTextContent('dark');
  });

  it('restores a saved light or dark choice', () => {
    localStorage.setItem('parknquik-theme-mode', 'light');
    const view = renderThemeApp();
    expect(screen.getByRole('combobox', { name: 'Color theme' })).toHaveTextContent('Light');
    expect(screen.getByTestId('palette-mode')).toHaveTextContent('light');
    view.unmount();
    localStorage.setItem('parknquik-theme-mode', 'dark');
    renderThemeApp();
    expect(screen.getByRole('combobox', { name: 'Color theme' })).toHaveTextContent('Dark');
    expect(screen.getByTestId('palette-mode')).toHaveTextContent('dark');
  });

  it('switches modes from navigation and persists the choice', async () => {
    const user = userEvent.setup();
    renderThemeApp();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Color theme' }), 'dark');
    expect(screen.getByTestId('palette-mode')).toHaveTextContent('dark');
    expect(localStorage.getItem('parknquik-theme-mode')).toBe('dark');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Color theme' }), 'light');
    expect(screen.getByTestId('palette-mode')).toHaveTextContent('light');
  });

  it('uses coordinated dark surfaces and text', () => {
    const theme = createAppTheme('dark');
    expect(theme.palette.background.default).toBe('#111b19');
    expect(theme.palette.background.paper).toBe('#1a2824');
    expect(theme.palette.text.primary).toBe('#edf3ef');
  });
});
