import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/utils';
import api from '../../api';
import Perks from '../Perks';

vi.mock('../../api');
const mockApi = vi.mocked(api);
const history = (page: number) => ({
  transactions: [{ id: page, amount: 25, type: 'EARNED', description: `Activity ${page}`, createdAt: '2026-01-01T00:00:00Z' }],
  pagination: { page, pages: 2, total: 2 },
});

describe('Perks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockApi.get).mockImplementation(async (url, config) => {
      if (url === '/points/balance') return { data: { balance: 125 } };
      if (url === '/referrals/stats') return { data: { totalReferrals: 1, pendingReferrals: 0, activeReferrals: 1, completedReferrals: 0, totalPointsEarned: 50 } };
      if (url === '/points/history') return { data: history((config?.params as { page: number }).page) };
      throw new Error('Unexpected endpoint');
    });
    vi.mocked(mockApi.post).mockResolvedValue({ data: { referralCode: 'REF123' } });
  });

  it('shows balance, history, stats and moves between history pages', async () => {
    const user = userEvent.setup();
    render(<Perks />);
    expect(await screen.findByText('125')).toBeInTheDocument();
    expect(await screen.findByText('Activity 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Points Earned')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Activity 2')).toBeInTheDocument();
    expect(mockApi.get).toHaveBeenCalledWith('/points/history', { params: { page: 2, limit: 10 } });
  });

  it('reveals a code and reports clipboard success', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<Perks />);
    await user.click(screen.getByRole('button', { name: 'Reveal referral code' }));
    expect(await screen.findByText('REF123')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('REF123'));
    expect(screen.getByText('Referral code copied.')).toBeInTheDocument();
  });

  it('shows empty history and retry actions for unavailable data', async () => {
    vi.mocked(mockApi.get).mockImplementation(async (url) => {
      if (url === '/points/history') return { data: { transactions: [], pagination: { page: 1, pages: 0, total: 0 } } };
      throw new Error('Unavailable');
    });
    vi.mocked(mockApi.post).mockRejectedValue(new Error('Unavailable'));
    const user = userEvent.setup();
    render(<Perks />);
    expect(await screen.findByText('No points activity yet.')).toBeInTheDocument();
    expect(await screen.findByText('Balance unavailable.')).toBeInTheDocument();
    expect(await screen.findByText('Referral stats unavailable.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reveal referral code' }));
    expect(await screen.findByText('Referral code unavailable.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(3);
  });

  it('retries failed history requests', async () => {
    const user = userEvent.setup();
    let failed = false;
    vi.mocked(mockApi.get).mockImplementation(async (url) => {
      if (url === '/points/history') {
        if (!failed) { failed = true; throw new Error('Unavailable'); }
        return { data: history(1) };
      }
      if (url === '/points/balance') return { data: { balance: 0 } };
      return { data: { totalReferrals: 0, pendingReferrals: 0, activeReferrals: 0, completedReferrals: 0, totalPointsEarned: 0 } };
    });
    render(<Perks />);
    expect(await screen.findByText('History unavailable.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Activity 1')).toBeInTheDocument();
  });

  it('reports a clipboard failure without claiming the code was copied', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    render(<Perks />);
    await user.click(screen.getByRole('button', { name: 'Reveal referral code' }));
    await user.click(await screen.findByRole('button', { name: 'Copy code' }));
    expect(await screen.findByText('Could not copy the code. Please copy it manually.')).toBeInTheDocument();
  });

  it('shows transaction type, time, signed amount and a reference when present', async () => {
    vi.mocked(mockApi.get).mockImplementation(async (url) => {
      if (url === '/points/balance') return { data: { balance: 7 } };
      if (url === '/referrals/stats') return { data: { totalReferrals: 0, pendingReferrals: 0, activeReferrals: 0, completedReferrals: 0, totalPointsEarned: 0 } };
      return { data: { transactions: [
        { id: 1, type: 'EARNED', description: 'Completed booking', amount: 25, createdAt: '2026-01-01T12:00:00Z', referenceType: 'BOOKING', referenceId: 42 },
        { id: 2, type: 'SPENT', description: null, amount: -10, createdAt: '2026-01-02T12:00:00Z', referenceType: null, referenceId: null },
        { id: 3, type: 'EXPIRED', description: 'Expired balance', amount: -8, createdAt: '2026-01-03T12:00:00Z' },
        { id: 4, type: 'REFERRAL_BONUS', description: 'Referral points', amount: 50, createdAt: '2026-01-04T12:00:00Z', referenceType: null, referenceId: 43 },
      ], pagination: { page: 1, pages: 1, total: 4 } } };
    });
    render(<Perks />);
    expect(await screen.findByText('Completed booking')).toBeInTheDocument();
    expect(screen.getByText('BOOKING #42')).toBeInTheDocument();
    expect(screen.getByText('Reference #43')).toBeInTheDocument();
    expect(screen.getByText('+25 points')).toBeInTheDocument();
    expect(screen.getByText('-10 points')).toBeInTheDocument();
    expect(screen.getByText('SPENT')).toBeInTheDocument();
    expect(screen.getByText('Expired balance')).toBeInTheDocument();
    expect(screen.getByText(/Jan 1, 2026.*\d{1,2}:\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText('BOOKING #null')).not.toBeInTheDocument();
    expect(screen.getByText('Signup benefits are not active yet.', { exact: false })).toBeInTheDocument();
  });

  it('retries each failed section without replacing successful sections', async () => {
    const attempts = new Map<string, number>();
    vi.mocked(mockApi.get).mockImplementation(async (url) => {
      const count = (attempts.get(url) || 0) + 1;
      attempts.set(url, count);
      if (count === 1) throw new Error('Unavailable');
      if (url === '/points/balance') return { data: { balance: 0 } };
      if (url === '/points/history') return { data: history(1) };
      return { data: { totalReferrals: 2, pendingReferrals: 1, activeReferrals: 1, completedReferrals: 0, totalPointsEarned: 50 } };
    });
    const user = userEvent.setup();
    render(<Perks />);
    expect(await screen.findByText('Balance unavailable.')).toBeInTheDocument();
    expect(await screen.findByText('History unavailable.')).toBeInTheDocument();
    expect(await screen.findByText('Referral stats unavailable.')).toBeInTheDocument();
    for (const retry of screen.getAllByRole('button', { name: 'Retry' })) await user.click(retry);
    expect(await screen.findByText('Activity 1')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText('Points Earned')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(attempts.get('/points/balance')).toBe(2);
    expect(attempts.get('/points/history')).toBe(2);
    expect(attempts.get('/referrals/stats')).toBe(2);
  });
});
