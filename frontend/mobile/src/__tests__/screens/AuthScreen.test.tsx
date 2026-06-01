import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthScreen } from '../../screens/AuthScreen';
import { useAppDispatch, useAppSelector } from '../../store';
import { signup } from '../../store/slices/authSlice';

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
const mockSignup = signup as unknown as jest.Mock;

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

  it('keeps login form visible and shows a busy CTA while auth submits', () => {
    mockUseAppSelector.mockImplementation((selector) =>
      selector({
        auth: {
          loading: true,
          error: null,
        },
      })
    );

    const { getByLabelText, getByPlaceholderText, queryByText } = render(<AuthScreen />);
    const cta = getByLabelText('Login');

    expect(getByPlaceholderText('name@example.com')).toBeTruthy();
    expect(cta.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(queryByText('Logging in...')).toBeNull();
  });

  it('disables alternate auth actions while auth submits', () => {
    mockUseAppSelector.mockImplementation((selector) =>
      selector({
        auth: {
          loading: true,
          error: null,
        },
      })
    );

    const { getByLabelText, getByPlaceholderText } = render(<AuthScreen />);

    expect(getByLabelText('Sign Up tab').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Forgot password?').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Continue with Google').props.accessibilityState.disabled).toBe(true);
    expect(getByPlaceholderText('name@example.com').props.editable).toBe(false);
  });

  it('shows a validation error and does not submit signup with a one-character name', () => {
    const dispatch = jest.fn(() => ({ unwrap: jest.fn() }));
    mockUseAppDispatch.mockReturnValue(dispatch);

    const { getByLabelText, getByPlaceholderText, getByText, getAllByPlaceholderText } = render(<AuthScreen />);

    fireEvent.press(getByText('Sign Up'));
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'A');
    fireEvent.changeText(getByPlaceholderText('name@example.com'), 'new@example.com');
    fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
    fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
    fireEvent.press(getByLabelText('Sign Up'));

    expect(getByText('Name must be at least 2 characters')).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('trims signup name and lowercases trimmed email before dispatching', () => {
    const unwrap = jest.fn().mockResolvedValue(undefined);
    const dispatch = jest.fn(() => ({ unwrap }));
    mockUseAppDispatch.mockReturnValue(dispatch);

    const { getByLabelText, getByPlaceholderText, getByText, getAllByPlaceholderText } = render(<AuthScreen />);

    fireEvent.press(getByText('Sign Up'));
    fireEvent.changeText(getByPlaceholderText('John Doe'), '  New User  ');
    fireEvent.changeText(getByPlaceholderText('name@example.com'), '  New.User@Example.COM  ');
    fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
    fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
    fireEvent.press(getByLabelText('Sign Up'));

    expect(mockSignup).toHaveBeenCalledWith({
      name: 'New User',
      email: 'new.user@example.com',
      password: 'Password1',
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'auth/signup',
      payload: {
        name: 'New User',
        email: 'new.user@example.com',
        password: 'Password1',
      },
    });
  });

  it('alerts with the backend signup error message from a rejected thunk', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const dispatch = jest.fn(() => ({
      unwrap: jest.fn().mockRejectedValue('User already exists'),
    }));
    mockUseAppDispatch.mockReturnValue(dispatch);

    const { getByLabelText, getByPlaceholderText, getByText, getAllByPlaceholderText } = render(<AuthScreen />);

    fireEvent.press(getByText('Sign Up'));
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'New User');
    fireEvent.changeText(getByPlaceholderText('name@example.com'), 'new@example.com');
    fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
    fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
    fireEvent.press(getByLabelText('Sign Up'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Signup Failed', 'User already exists');
    });
  });

  it('renders normalized backend auth errors from state inline', () => {
    mockUseAppSelector.mockImplementation((selector) =>
      selector({
        auth: {
          loading: false,
          error: 'User already exists',
        },
      })
    );

    const { getByText } = render(<AuthScreen />);

    expect(getByText('User already exists')).toBeTruthy();
  });
});
