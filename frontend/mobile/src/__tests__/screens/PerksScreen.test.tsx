import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PerksScreen } from '../../screens/PerksScreen';
import pointsReducer from '../../store/slices/pointsSlice';
import { pointsAPI } from '../../services/api';
import * as Clipboard from 'expo-clipboard';

jest.mock('../../services/api', () => ({ pointsAPI: {
  getBalance: jest.fn(), getHistory: jest.fn(), getReferralStats: jest.fn(), generateReferralCode: jest.fn(),
} }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
jest.mock('../../hooks/useStatusBarStyle', () => ({ useStatusBarStyle: () => 'dark' }));
jest.mock('../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: {
  appHeaderBackground: '#000', background: '#fff', surface: '#fff', border: '#ddd',
  textPrimary: '#111', textSecondary: '#555', textTertiary: '#777', error: '#c00',
  primary: '#080', white: '#fff', success: '#080', warning: '#b80', accent: '#080', accentYellow: '#fc0',
} }) }));

const transaction = {
  id: 12, userId: 1, amount: -25, balanceAfter: 75, type: 'SPENT', source: 'REDEMPTION',
  referenceId: 44, referenceType: 'BOOKING', description: 'Parking discount', expiresAt: null,
  isExpired: false, status: 'active', createdAt: '2026-11-18T10:00:00.000Z',
};

const renderScreen = async () => {
  const store = configureStore({ reducer: { points: pointsReducer } });
  return { ...await render(<Provider store={store}><PerksScreen /></Provider>), store };
};

describe('PerksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pointsAPI.getBalance as jest.Mock).mockResolvedValue({ data: { balance: 75 } });
    (pointsAPI.getHistory as jest.Mock).mockResolvedValue({ data: { transactions: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } });
    (pointsAPI.getReferralStats as jest.Mock).mockResolvedValue({ data: {
      totalReferrals: 3, pendingReferrals: 1, activeReferrals: 1, completedReferrals: 1, totalPointsEarned: 100,
    } });
    (pointsAPI.generateReferralCode as jest.Mock).mockResolvedValue({ data: { referralCode: 'REF123' } });
    (Clipboard.setStringAsync as jest.Mock).mockResolvedValue(true);
  });

  it('shows balance, empty history, five stats, and reveals an existing or new code', async () => {
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByText('75 points')).toBeTruthy());
    expect(screen.getByText('No points transactions yet.')).toBeTruthy();
    for (const label of ['Total', 'Pending', 'Active', 'Completed', 'Points Earned']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    await fireEvent.press(screen.getByLabelText('Reveal my code'));
    await waitFor(() => expect(screen.getByText('REF123')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Copy referral code'));
    await waitFor(() => expect(screen.getByText('Code copied')).toBeTruthy());
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('REF123');
  });

  it('loads another history page and shows transaction reference details', async () => {
    (pointsAPI.getHistory as jest.Mock)
      .mockResolvedValueOnce({ data: { transactions: [transaction], pagination: { page: 1, limit: 20, total: 21, pages: 2 } } })
      .mockResolvedValueOnce({ data: { transactions: [{ ...transaction, id: 13, amount: 10, type: 'EARNED' }], pagination: { page: 2, limit: 20, total: 21, pages: 2 } } });
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByText('Ref: BOOKING 44')).toBeTruthy());
    expect(screen.getByText('-25')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Load more transactions'));
    await waitFor(() => expect(screen.store.getState().points.transactions).toHaveLength(2));
    expect(pointsAPI.getHistory).toHaveBeenCalledWith(2, 20);
  });

  it('shows independent failures and retries, and reports failed clipboard writes', async () => {
    (pointsAPI.getBalance as jest.Mock).mockRejectedValueOnce(new Error('Balance offline'));
    (pointsAPI.getHistory as jest.Mock).mockRejectedValueOnce(new Error('History offline'));
    (pointsAPI.getReferralStats as jest.Mock).mockRejectedValueOnce(new Error('Stats offline'));
    (Clipboard.setStringAsync as jest.Mock).mockResolvedValue(false);
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByText('Balance offline')).toBeTruthy());
    expect(screen.getByText('History offline')).toBeTruthy();
    expect(screen.getByText('Stats offline')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Retry points balance'));
    await fireEvent.press(screen.getByLabelText('Retry points history'));
    await fireEvent.press(screen.getByLabelText('Retry referral stats'));
    await waitFor(() => expect(screen.getByText('75 points')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Reveal my code'));
    await waitFor(() => expect(screen.getByText('REF123')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Copy referral code'));
    await waitFor(() => expect(screen.getByText('Could not copy code. Please try again.')).toBeTruthy());
  });
});
