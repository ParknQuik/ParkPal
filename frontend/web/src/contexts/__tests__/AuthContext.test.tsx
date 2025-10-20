import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import api from '../../api';
import type { AuthResponse } from '../../types';

// Mock the api module
vi.mock('../../api');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should start with null user and no token', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should restore user from localStorage on mount', () => {
      const mockUser = {
        id: 1,
        email: 'stored@example.com',
        name: 'Stored User',
        role: 'driver' as const,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      };
      const mockToken = 'stored-token';

      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Login', () => {
    it('should login successfully and update state', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'driver',
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        token: 'mock-jwt-token',
      };

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'Password123');
      });

      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.token).toBe(mockResponse.token);
      expect(result.current.isAuthenticated).toBe(true);

      // Verify localStorage
      expect(localStorage.getItem('token')).toBe(mockResponse.token);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.user));
    });

    it('should handle login errors', async () => {
      const errorMessage = 'Invalid credentials';
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { error: errorMessage } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('wrong@example.com', 'wrongpass');
        })
      ).rejects.toThrow();

      // State should remain unchanged
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(api.post).mockReturnValueOnce(loginPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start login
      act(() => {
        result.current.login('test@example.com', 'password');
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve login
      await act(async () => {
        resolveLogin!({
          data: {
            user: { id: 1, email: 'test@example.com', name: 'Test', role: 'driver' },
            token: 'token',
          },
        });
        await loginPromise;
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register successfully and update state', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: 2,
          email: 'new@example.com',
          name: 'New User',
          role: 'driver',
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        token: 'new-jwt-token',
      };

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register('New User', 'new@example.com', 'Password123');
      });

      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.token).toBe(mockResponse.token);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle registration errors', async () => {
      const errorMessage = 'Email already exists';
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { error: errorMessage } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.register('Test', 'existing@example.com', 'Password123');
        })
      ).rejects.toThrow();

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should logout and clear state', async () => {
      // First login
      const mockResponse: AuthResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test',
          role: 'driver',
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        token: 'token',
      };

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Now logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      // Verify localStorage cleared
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('Update User', () => {
    it('should update user state and localStorage', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const newUser = {
        id: 1,
        email: 'updated@example.com',
        name: 'Updated Name',
        role: 'host' as const,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      };

      act(() => {
        result.current.updateUser(newUser);
      });

      expect(result.current.user).toEqual(newUser);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(newUser));
    });
  });

  describe('useAuth Hook Error', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });
  });
});
