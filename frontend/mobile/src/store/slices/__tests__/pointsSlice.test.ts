import { configureStore } from '@reduxjs/toolkit';
import pointsReducer, { fetchBalance, fetchHistory, fetchReferralStats, generateReferralCode } from '../pointsSlice';
import { pointsAPI } from '../../../services/api';
import { logout, sessionInvalidated } from '../authSlice';

jest.mock('../../../services/api', () => ({
  pointsAPI: {
    generateReferralCode: jest.fn(),
    getBalance: jest.fn(),
    getHistory: jest.fn(),
    getReferralStats: jest.fn(),
  },
}));

describe('pointsSlice referral code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the referralCode returned by the backend for new and existing codes', async () => {
    const store = configureStore({ reducer: { points: pointsReducer } });
    (pointsAPI.generateReferralCode as jest.Mock)
      .mockResolvedValueOnce({ data: { referralCode: 'REFNEW123' } })
      .mockResolvedValueOnce({ data: { referralCode: 'REFNEW123' } });

    await store.dispatch(generateReferralCode());
    expect(store.getState().points.referralCode).toBe('REFNEW123');

    await store.dispatch(generateReferralCode());
    expect(store.getState().points.referralCode).toBe('REFNEW123');
    expect(pointsAPI.generateReferralCode).toHaveBeenCalledTimes(2);
  });
});

describe('pointsSlice section state', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps balance and history errors separate from successful referral stats', async () => {
    const store = configureStore({ reducer: { points: pointsReducer } });
    (pointsAPI.getBalance as jest.Mock).mockRejectedValue(new Error('Balance offline'));
    (pointsAPI.getHistory as jest.Mock).mockRejectedValue(new Error('History offline'));
    (pointsAPI.getReferralStats as jest.Mock).mockResolvedValue({ data: {
      totalReferrals: 2, pendingReferrals: 1, activeReferrals: 1,
      completedReferrals: 0, totalPointsEarned: 0,
    } });

    await Promise.all([
      store.dispatch(fetchBalance()),
      store.dispatch(fetchHistory({ page: 1, limit: 20 })),
      store.dispatch(fetchReferralStats()),
    ]);

    const state = store.getState().points;
    expect(state.balanceError).toBe('Balance offline');
    expect(state.historyError).toBe('History offline');
    expect(state.referralStatsError).toBeNull();
    expect(state.referralStats?.totalReferrals).toBe(2);
  });

  it('replaces page one and appends later pages using backend pagination.pages', async () => {
    const store = configureStore({ reducer: { points: pointsReducer } });
    (pointsAPI.getHistory as jest.Mock)
      .mockResolvedValueOnce({ data: { transactions: [{ id: 1 }], pagination: { page: 1, limit: 1, total: 2, pages: 2 } } })
      .mockResolvedValueOnce({ data: { transactions: [{ id: 2 }], pagination: { page: 2, limit: 1, total: 2, pages: 2 } } })
      .mockResolvedValueOnce({ data: { transactions: [{ id: 3 }], pagination: { page: 1, limit: 1, total: 1, pages: 1 } } });

    await store.dispatch(fetchHistory({ page: 1, limit: 1 }));
    await store.dispatch(fetchHistory({ page: 2, limit: 1 }));
    expect(store.getState().points.transactions.map(({ id }) => id)).toEqual([1, 2]);
    expect(store.getState().points.pagination?.pages).toBe(2);
    await store.dispatch(fetchHistory({ page: 1, limit: 1 }));
    expect(store.getState().points.transactions.map(({ id }) => id)).toEqual([3]);
  });

  it('ignores a stale page two result after page one refreshes', async () => {
    const store = configureStore({ reducer: { points: pointsReducer } });
    let resolvePageTwo!: (value: any) => void;
    (pointsAPI.getHistory as jest.Mock)
      .mockResolvedValueOnce({ data: { transactions: [{ id: 1 }], pagination: { page: 1, limit: 1, total: 2, pages: 2 } } })
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePageTwo = resolve; }))
      .mockResolvedValueOnce({ data: { transactions: [{ id: 3 }], pagination: { page: 1, limit: 1, total: 1, pages: 1 } } });

    await store.dispatch(fetchHistory({ page: 1, limit: 1 }));
    const pageTwo = store.dispatch(fetchHistory({ page: 2, limit: 1 }));
    await store.dispatch(fetchHistory({ page: 1, limit: 1 }));
    resolvePageTwo({ data: { transactions: [{ id: 2 }], pagination: { page: 2, limit: 1, total: 2, pages: 2 } } });
    await pageTwo;
    expect(store.getState().points.transactions.map(({ id }) => id)).toEqual([3]);
    expect(store.getState().points.pagination?.pages).toBe(1);
  });

  it('clears private points data on session invalidation and ignores late responses', async () => {
    const store = configureStore({ reducer: { points: pointsReducer } });
    let resolveBalance!: (value: any) => void;
    (pointsAPI.getBalance as jest.Mock).mockImplementation(() => new Promise((resolve) => { resolveBalance = resolve; }));
    (pointsAPI.generateReferralCode as jest.Mock).mockResolvedValue({ data: { referralCode: 'OLD-CODE' } });
    await store.dispatch(generateReferralCode());
    const pendingBalance = store.dispatch(fetchBalance());
    store.dispatch(sessionInvalidated());
    resolveBalance({ data: { balance: 500 } });
    await pendingBalance;
    expect(store.getState().points.balance).toBeNull();
    expect(store.getState().points.referralCode).toBeNull();
    expect(store.getState().points.requestIds.balance).toBeNull();

    await store.dispatch(generateReferralCode());
    store.dispatch(logout.fulfilled(undefined, 'logout-request'));
    expect(store.getState().points.referralCode).toBeNull();
  });
});
