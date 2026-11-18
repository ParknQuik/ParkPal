import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '../api';
import type { User, AuthResponse } from '../types';
import { AxiosError } from 'axios';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<'password' | 'mfa' | null>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authErrorMessage(error: AxiosError<{ error: string; retryAfter?: number }>, fallback: string): string {
  const message = error.response?.data?.error || fallback;
  if (error.response?.status !== 429) return message;
  const retryAfter = Number(error.response.data?.retryAfter || error.response.headers['retry-after']);
  return retryAfter > 0
    ? `${message} You can try again in ${retryAfter} seconds.`
    : `${message} Please wait before trying again.`;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (email: string, password: string): Promise<'password' | 'mfa' | null> => {
    setIsLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const needsMfa = Boolean(data.mfaRequired || data.mfaEnrollmentRequired);
      sessionStorage.setItem('admin-mfa-required', String(needsMfa));
      if (needsMfa) sessionStorage.removeItem('admin-mfa-verified');
      else sessionStorage.setItem('admin-mfa-verified', 'true');
      if (data.mustChangePassword) return 'password';
      return needsMfa ? 'mfa' : null;
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      throw new Error(authErrorMessage(axiosError, 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
      });

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      throw new Error(authErrorMessage(axiosError, 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('admin-mfa-verified');
    sessionStorage.removeItem('admin-mfa-required');
  };

  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
