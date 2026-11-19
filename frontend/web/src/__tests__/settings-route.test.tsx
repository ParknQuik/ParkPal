import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('public Settings route', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/settings');
  });

  it('renders Settings for a guest and links to it from the footer', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo').querySelector('a[href="/settings"]')).toHaveTextContent('Settings');
    expect(document.title).toBe('Settings | ParknQuik');
  });

  it('reopens the privacy panel from Settings after a saved choice', async () => {
    localStorage.setItem('parkpal-analytics-consent', 'rejected');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Manage privacy choices' }));
    expect(screen.getByRole('region', { name: 'Privacy choices' })).toBeInTheDocument();
    expect(localStorage.getItem('parkpal-analytics-consent')).toBeNull();
  });
});
