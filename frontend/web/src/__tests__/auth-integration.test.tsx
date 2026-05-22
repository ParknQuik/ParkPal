import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import Login from '../screens/Login';
import api from '../api';

// Mock the api module
vi.mock('../api');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Auth Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should complete full registration and login flow', async () => {
    const user = userEvent.setup();

    // Mock successful registration
    const registerResponse = {
      data: {
        user: { id: 1, email: 'newuser@example.com', name: 'New User', role: 'driver' },
        token: 'registration-token',
      },
    };

    render(<Login />);

    // Switch to register tab
    await user.click(screen.getByRole('tab', { name: /register/i }));

    // Fill in registration form
    await user.type(screen.getByLabelText(/name/i), 'New User');
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');

    // Mock successful registration
    vi.mocked(api.post).mockResolvedValueOnce(registerResponse);

    // Submit registration
    await user.click(screen.getByRole('button', { name: /^register$/i }));

    // Should call registration API
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'Password123',
      });
    });

    // Verify token and user stored
    expect(localStorage.getItem('token')).toBe('registration-token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(registerResponse.data.user));

    // Verify navigation was called
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('should handle login after registration', async () => {
    const user = userEvent.setup();

    const loginResponse = {
      data: {
        user: { id: 1, email: 'newuser@example.com', name: 'New User', role: 'driver' },
        token: 'login-token',
      },
    };

    render(<Login />);

    // Fill login form
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');

    vi.mocked(api.post).mockResolvedValueOnce(loginResponse);

    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'newuser@example.com',
        password: 'Password123',
      });
    });

    // Verify login token stored
    expect(localStorage.getItem('token')).toBe('login-token');
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('should show validation errors preventing registration submission', async () => {
    const user = userEvent.setup();

    render(<Login />);

    // Switch to register
    await user.click(screen.getByRole('tab', { name: /register/i }));

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /^register$/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    // API should not have been called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should show validation errors preventing login submission', async () => {
    const user = userEvent.setup();

    render(<Login />);

    // Try to submit empty login form
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    // API should not have been called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully during registration', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email already exists';

    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { error: errorMessage } },
    });

    render(<Login />);

    // Switch to register
    await user.click(screen.getByRole('tab', { name: /register/i }));

    // Fill form with existing email
    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /^register$/i }));

    // Should display error
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should not navigate or store token
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully during login', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';

    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { error: errorMessage } },
    });

    render(<Login />);

    // Fill login form
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Should display error
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should not navigate or store token
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();

    render(<Login />);

    // Type invalid email
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalidemail');

    // Blur to trigger validation
    await user.tab();

    // Should show email format error
    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    // API should not be called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should validate password length', async () => {
    const user = userEvent.setup();

    render(<Login />);

    // Type short password
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, '12345');

    // Blur to trigger validation
    await user.tab();

    // Should show password length error
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    // API should not be called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should clear form and errors when switching between tabs', async () => {
    const user = userEvent.setup();

    render(<Login />);

    // Fill login form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');

    // Switch to register
    await user.click(screen.getByRole('tab', { name: /register/i }));

    // Fields should be cleared
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toHaveValue('');
      expect(screen.getByLabelText(/password/i)).toHaveValue('');
    });

    // Switch back to login
    await user.click(screen.getByRole('tab', { name: /login/i }));

    // Fields should still be cleared
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
    expect(screen.getByLabelText(/password/i)).toHaveValue('');
  });
});
