import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SecurityPrivacyScreen } from '../../screens/SecurityPrivacyScreen';
import { useAppDispatch, useAppSelector } from '../../store';
import { setAnalyticsOptIn } from '../../store/slices/analyticsSlice';
import { analyticsAPI } from '../../services/api';
import GeofenceService from '../../services/analyticsGeofenceService';

jest.mock('../../store', () => ({ useAppDispatch: jest.fn(), useAppSelector: jest.fn() }));
jest.mock('../../store/slices/analyticsSlice', () => ({ setAnalyticsOptIn: jest.fn((value) => ({ type: 'analytics/setOptIn', payload: value })) }));
jest.mock('../../services/api', () => ({ analyticsAPI: { revokeConsent: jest.fn().mockResolvedValue({}) } }));
jest.mock('../../services/analyticsGeofenceService', () => ({ __esModule: true, default: { stop: jest.fn() } }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: {
  background: '#fff', appHeaderBackground: '#fff', textPrimary: '#111', textSecondary: '#555',
  surface: '#eee', border: '#ddd', primary: '#0a8',
} }) }));
jest.mock('../../hooks/useStatusBarStyle', () => ({ useStatusBarStyle: () => 'dark' }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../components/AccountStanding', () => ({ AccountStanding: () => null }));
jest.mock('../../store/slices/behaviorSlice', () => ({ fetchBehaviorStatus: () => ({ type: 'behavior/fetch' }) }));
jest.mock('../../store/slices/settingsSlice', () => ({ setThemeMode: (value: string) => ({ type: 'settings/theme', payload: value }) }));

describe('SecurityPrivacyScreen analytics consent', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as jest.Mock).mockReturnValue(dispatch);
    (useAppSelector as jest.Mock).mockImplementation((selector) => selector({
      settings: { themeMode: 'system' },
      behavior: { status: null },
      analytics: { optedIn: true },
    }));
  });

  it('stops tracking and requests deletion when analytics consent is revoked', () => {
    const { getByLabelText } = render(<SecurityPrivacyScreen />);
    fireEvent(getByLabelText('Contribute parking analytics'), 'valueChange', false);

    expect(GeofenceService.stop).toHaveBeenCalled();
    expect(setAnalyticsOptIn).toHaveBeenCalledWith(false);
    expect(dispatch).toHaveBeenCalledWith({ type: 'analytics/setOptIn', payload: false });
    expect(analyticsAPI.revokeConsent).toHaveBeenCalled();
  });
});
