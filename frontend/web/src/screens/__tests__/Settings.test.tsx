import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeModeProvider } from '../../theme/ThemeModeProvider';
import Settings from '../Settings';
import type { User } from '../../types';

const baseUser: User = { id: 1, email: 'driver@example.com', name: 'Driver User', role: 'driver', createdAt: '2025-01-01', updatedAt: '2025-01-01' };

function renderSettings(user: User | null = null) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', 'mock-token');
  }
  return render(<BrowserRouter><ThemeModeProvider><AuthProvider><Settings /></AuthProvider></ThemeModeProvider></BrowserRouter>);
}

describe('Settings', () => {
  beforeEach(() => localStorage.clear());

  it('shows public controls and a sign-in link to guests', () => {
    renderSettings();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Color theme' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
  });

  it.each([
    [baseUser, 'List a space', '/list-slot'],
    [{ ...baseUser, canHost: true }, 'My listings', '/host-dashboard'],
    [{ ...baseUser, role: 'host' as const }, 'My listings', '/host-dashboard'],
    [{ ...baseUser, role: 'admin' as const }, 'Admin dashboard', '/admin-dashboard'],
  ])('shows account destinations for %j', (user, label, path) => {
    renderSettings(user);
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'My bookings' })).toHaveAttribute('href', '/bookings');
    expect(screen.getByRole('link', { name: 'My vehicles' })).toHaveAttribute('href', '/vehicles');
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', path);
  });

  it('opens the existing privacy controls', async () => {
    const listener = vi.fn();
    window.addEventListener('parkpal:privacy-choices', listener);
    renderSettings();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Manage privacy choices' }));
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('parkpal:privacy-choices', listener);
  });
});
