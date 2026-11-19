import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import api from '../api';

vi.mock('../api');

describe('Perks route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('parkpal-analytics-consent', 'rejected');
    window.history.pushState({}, '', '/perks');
  });

  it('requires sign in', async () => {
    render(<App />);
    expect(await screen.findByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('renders for a signed-in user and sets metadata', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Driver', email: 'driver@example.com', role: 'driver' }));
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/points/balance') return { data: { balance: 0 } };
      if (url === '/points/history') return { data: { transactions: [], pagination: { page: 1, pages: 0, total: 0 } } };
      return { data: { totalReferrals: 0, pendingReferrals: 0, activeReferrals: 0, completedReferrals: 0, totalPointsEarned: 0 } };
    });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Perks' })).toBeInTheDocument();
    expect(document.title).toBe('Your perks | ParknQuik');
  });
});
