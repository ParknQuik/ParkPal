import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import Login from '../Login';
import api from '../../api';

// Mock the api module
vi.mock('../../api');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render login form by default', () => {
      render(<Login />);

      expect(screen.getByText('ParknQuik')).toBeInTheDocument();
      expect(screen.getByText('Find and list parking spaces')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /register/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    });

    it('should render register form when register tab is clicked', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const registerTab = screen.getByRole('tab', { name: /register/i });
      await user.click(registerTab);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument();
    });
  });

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'driver' },
          token: 'mock-jwt-token',
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      render(<Login />);

      // Fill in form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123');

      // Submit
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      // Verify API call
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'Password123',
        });
      });

      // Verify localStorage
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.data.user));

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith('/search');
    });

    it('should display error on failed login', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';

      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { error: errorMessage } },
      });

      render(<Login />);

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should not navigate or save to localStorage
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should show loading state during login', async () => {
      const user = userEvent.setup();

      // Create a promise that we can control
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(api.post).mockReturnValueOnce(loginPromise as any);

      render(<Login />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      // Button should be disabled and show loading text
      const button = screen.getByRole('button', { name: /logging in/i });
      expect(button).toBeDisabled();

      // Resolve the promise
      resolveLogin!({
        data: {
          user: { id: 1, email: 'test@example.com', name: 'Test' },
          token: 'token',
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^login$/i })).not.toBeDisabled();
      });
    });

    it('should show validation errors for empty fields', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const submitButton = screen.getByRole('button', { name: /^login$/i });
      await user.click(submitButton);

      // react-hook-form validation will show error messages
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Registration Flow', () => {
    it('should handle successful registration', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          user: { id: 2, email: 'new@example.com', name: 'New User', role: 'driver' },
          token: 'new-jwt-token',
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      render(<Login />);

      // Switch to register tab
      await user.click(screen.getByRole('tab', { name: /register/i }));

      // Fill in form
      await user.type(screen.getByLabelText(/name/i), 'New User');
      await user.type(screen.getByLabelText(/email/i), 'new@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123');

      // Submit
      await user.click(screen.getByRole('button', { name: /^register$/i }));

      // Verify API call
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          name: 'New User',
          email: 'new@example.com',
          password: 'Password123',
        });
      });

      // Verify localStorage
      expect(localStorage.getItem('token')).toBe('new-jwt-token');

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith('/search');
    });

    it('should display error on failed registration', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already exists';

      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { error: errorMessage } },
      });

      render(<Login />);

      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/name/i), 'Test');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /^register$/i }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show validation errors for empty registration fields', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const registerTab = screen.getByRole('tab', { name: /register/i });
      await user.click(registerTab);

      const submitButton = screen.getByRole('button', { name: /^register$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Switching', () => {
    it('should clear form and errors when switching tabs', async () => {
      const user = userEvent.setup();

      render(<Login />);

      // Type in login form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password');

      // Switch to register
      await user.click(screen.getByRole('tab', { name: /register/i }));

      // Fields should be cleared
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toHaveValue('');
        expect(screen.getByLabelText(/password/i)).toHaveValue('');
      });
    });
  });
});
