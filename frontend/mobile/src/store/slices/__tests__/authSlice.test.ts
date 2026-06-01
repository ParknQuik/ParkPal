import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  login,
  signup,
  logout,
  checkAuth,
  updateUserProfile,
  clearError,
} from '../authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../../services/api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock API
jest.mock('../../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    signup: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

describe('authSlice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state).toEqual({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        checkingAuth: false,
        error: null,
      });
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    };
    const mockToken = 'mock-jwt-token';

    it('should handle successful login', async () => {
      (authAPI.login as jest.Mock).mockResolvedValue({
        data: { user: mockUser, token: mockToken },
      });

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(
        login({ email: 'test@example.com', password: 'password123' })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockUser)
      );
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (authAPI.login as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(
        login({ email: 'test@example.com', password: 'wrong' })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should set loading state during login', () => {
      const promise = store.dispatch(
        login({ email: 'test@example.com', password: 'password123' })
      );

      const state = store.getState().auth;
      expect(state.loading).toBe(true);
    });
  });

  describe('signup', () => {
    const mockUser = {
      id: 1,
      name: 'New User',
      email: 'new@example.com',
    };
    const mockToken = 'mock-jwt-token';

    it('should handle successful signup', async () => {
      (authAPI.signup as jest.Mock).mockResolvedValue({
        data: { user: mockUser, token: mockToken },
      });

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(
        signup({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should handle signup failure', async () => {
      const errorMessage = 'Email already exists';
      (authAPI.signup as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(
        signup({
          name: 'New User',
          email: 'existing@example.com',
          password: 'password123',
        })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should use backend signup error messages from 400 responses', async () => {
      (authAPI.signup as jest.Mock).mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'User already exists',
          },
        },
        message: 'Request failed with status code 400',
      });

      await store.dispatch(
        signup({
          name: 'New User',
          email: 'existing@example.com',
          password: 'Password1',
        })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('User already exists');
    });

    it('should use backend signup validation detail messages from 400 responses', async () => {
      (authAPI.signup as jest.Mock).mockRejectedValue({
        response: {
          status: 400,
          data: {
            details: [
              { message: 'Name must be at least 2 characters' },
              { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
            ],
          },
        },
        message: 'Request failed with status code 400',
      });

      await store.dispatch(
        signup({
          name: 'A',
          email: 'new@example.com',
          password: 'password123',
        })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(
        'Name must be at least 2 characters\nPassword must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    });
  });

  describe('logout', () => {
    it('should clear user data on logout', async () => {
      // First set some user data
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      };
      const mockToken = 'mock-jwt-token';

      (authAPI.login as jest.Mock).mockResolvedValue({
        data: { user: mockUser, token: mockToken },
      });

      await store.dispatch(
        login({ email: 'test@example.com', password: 'password123' })
      );

      // Then logout
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(logout());

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
      expect(state.isAuthenticated).toBe(false);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('checkAuth', () => {
    it('should restore auth state from storage', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      };
      const mockToken = 'mock-jwt-token';

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'token') return Promise.resolve(mockToken);
        if (key === 'user') return Promise.resolve(JSON.stringify(mockUser));
        return Promise.resolve(null);
      });

      await store.dispatch(checkAuth());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.checkingAuth).toBe(false);
    });

    it('should handle missing auth data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await store.dispatch(checkAuth());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
      expect(state.checkingAuth).toBe(false);
    });

    it('should set checkingAuth while restoring auth state', () => {
      (AsyncStorage.getItem as jest.Mock).mockReturnValue(new Promise(() => {}));

      store.dispatch(checkAuth());

      const state = store.getState().auth;
      expect(state.checkingAuth).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        id: 1,
        name: 'Updated Name',
        email: 'test@example.com',
        phone: '+1234567890',
      };

      (authAPI.updateProfile as jest.Mock).mockResolvedValue({
        data: updatedUser,
      });

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(
        updateUserProfile({ name: 'Updated Name', phone: '+1234567890' })
      );

      const state = store.getState().auth;
      expect(state.user).toEqual(updatedUser);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(updatedUser)
      );
    });

    it('should handle profile update failure', async () => {
      const errorMessage = 'Update failed';
      (authAPI.updateProfile as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await store.dispatch(
        updateUserProfile({ name: 'Updated Name', phone: null })
      );

      const state = store.getState().auth;
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // First create an error
      (authAPI.login as jest.Mock).mockRejectedValue(
        new Error('Login failed')
      );

      await store.dispatch(
        login({ email: 'test@example.com', password: 'wrong' })
      );

      let state = store.getState().auth;
      expect(state.error).toBe('Login failed');

      // Then clear it
      store.dispatch(clearError());

      state = store.getState().auth;
      expect(state.error).toBe(null);
    });
  });
});
