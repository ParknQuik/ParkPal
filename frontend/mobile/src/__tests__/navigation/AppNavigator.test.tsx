import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from '../../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../../store';

jest.mock('../../store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../store/slices/authSlice', () => ({
  checkAuth: jest.fn(() => ({ type: 'auth/checkAuth' })),
}));

jest.mock('../../store/slices/analyticsSlice', () => ({
  loadAnalyticsOptIn: jest.fn(() => ({ type: 'analytics/loadOptIn' })),
  setAnalyticsOptIn: jest.fn((payload) => ({ type: 'analytics/setOptIn', payload })),
}));

jest.mock('../../services/api', () => ({
  analyticsAPI: {
    getZones: jest.fn(),
  },
}));

jest.mock('../../services/analyticsGeofenceService', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('../../context/ThemeContext', () => {
  const { lightColors } = require('../../theme/colors');

  return {
    useTheme: () => ({
      colors: lightColors,
      isDark: false,
      themeMode: 'light',
    }),
  };
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    DefaultTheme: { colors: {} },
    DarkTheme: { colors: {} },
    NavigationContainer: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const Icon = ({ name }: { name?: string }) => <Text>{name}</Text>;

  return {
    MaterialCommunityIcons: Icon,
  };
});

jest.mock('../../navigation/MainStack', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MainStack: () => <Text>MainStack</Text>,
  };
});

jest.mock('../../navigation/AuthStack', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    AuthStack: () => <Text>AuthStack</Text>,
  };
});

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;

let appState: any = {
  auth: {
    isAuthenticated: false,
    checkingAuth: false,
    user: null,
  },
  analytics: {
    optedIn: false,
  },
};

describe('AppNavigator auth transition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(jest.fn());
    appState.auth = {
      isAuthenticated: false,
      checkingAuth: false,
      user: null,
    };
    appState.analytics = {
      optedIn: false,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    mockUseAppSelector.mockImplementation((selector) => selector(appState));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the branded loading screen while startup auth is checked', () => {
    appState.auth.checkingAuth = true;

    const { getByText, getByLabelText } = render(<AppNavigator />);

    expect(getByText('ParknQuik')).toBeTruthy();
    expect(getByLabelText('ParknQuik is loading').props.accessibilityState.busy).toBe(true);
  });

  it('renders AuthStack after unauthenticated startup auth resolves', async () => {
    const { getByText } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText('AuthStack')).toBeTruthy();
    });
  });

  it('renders the interstitial before MainStack after successful auth', async () => {
    const screen = render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText('AuthStack')).toBeTruthy();
    });

    appState.auth.isAuthenticated = true;
    screen.rerender(<AppNavigator />);

    expect(screen.getByText('ParknQuik')).toBeTruthy();
    expect(screen.queryByText('MainStack')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(700);
    });

    expect(screen.getByText('MainStack')).toBeTruthy();
  });
});
