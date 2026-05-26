import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AuthScreen } from '../../screens/AuthScreen';
import { useAppDispatch, useAppSelector } from '../../store';

const mockNavigationDispatch = jest.fn();

jest.mock('../../store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../store/slices/authSlice', () => ({
  login: jest.fn((payload) => ({ type: 'auth/login', payload })),
  signup: jest.fn((payload) => ({ type: 'auth/signup', payload })),
  setUser: jest.fn((payload) => ({ type: 'auth/setUser', payload })),
  setToken: jest.fn((payload) => ({ type: 'auth/setToken', payload })),
}));

jest.mock('../../services/api', () => ({
  authAPI: {
    googleSignIn: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  CommonActions: {
    navigate: jest.fn((payload) => ({
      type: 'NAVIGATE',
      payload,
    })),
  },
  useNavigation: () => ({
    dispatch: mockNavigationDispatch,
  }),
}));

jest.mock('expo-auth-session', () => ({
  Prompt: {
    SelectAccount: 'select_account',
  },
  makeRedirectUri: jest.fn(() => 'parknquik://redirect'),
  useAuthRequest: jest.fn(() => [{}, null, jest.fn()]),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

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

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(jest.fn());
    mockUseAppSelector.mockImplementation((selector) =>
      selector({
        auth: {
          loading: false,
          error: null,
        },
      })
    );
  });

  it('renders the focused login screen without the old header and marketing elements', () => {
    const { getByText, queryByText, queryByLabelText } = render(<AuthScreen />);

    expect(getByText('ParknQuik')).toBeTruthy();
    expect(queryByText('Welcome Back')).toBeNull();
    expect(queryByText('New Update')).toBeNull();
    expect(queryByText('Start Your Journey')).toBeNull();
    expect(queryByLabelText('Apple sign in coming soon')).toBeNull();
  });

  it('shows the login form controls and Google sign-in', () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(<AuthScreen />);

    expect(getByPlaceholderText('name@example.com')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
    expect(getByText('Remember me')).toBeTruthy();
    expect(getByText('Forgot password?')).toBeTruthy();
    expect(getByLabelText('Continue with Google')).toBeTruthy();
    expect(getByLabelText('Login')).toBeTruthy();
  });

  it('switches to signup fields', () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<AuthScreen />);

    fireEvent.press(getByText('Sign Up'));

    expect(getByText('Full Name')).toBeTruthy();
    expect(getByPlaceholderText('John Doe')).toBeTruthy();
    expect(getByText('Confirm Password')).toBeTruthy();
    expect(getAllByText('Sign Up')).toHaveLength(2);
  });

  it('navigates to forgot password from login mode', () => {
    const { getByText } = render(<AuthScreen />);

    fireEvent.press(getByText('Forgot password?'));

    const { CommonActions } = require('@react-navigation/native');
    expect(CommonActions.navigate).toHaveBeenCalledWith({ name: 'ForgotPassword' });
    expect(mockNavigationDispatch).toHaveBeenCalledWith({
      type: 'NAVIGATE',
      payload: { name: 'ForgotPassword' },
    });
  });
});
