import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { NavBar } from '../NavBar';
import { AuthProvider } from '../../contexts/AuthContext';
import type { User } from '../../types';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderNavBar = (user: User | null = null) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', 'mock-token');
  }

  return render(
    <AuthProvider>
      <NavBar />
    </AuthProvider>
  );
};

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render ParkPal logo', () => {
    renderNavBar();
    expect(screen.getByText('ParkPal')).toBeInTheDocument();
  });

  it('should show login button when not authenticated', () => {
    renderNavBar();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should show user name and avatar when authenticated', async () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
      role: 'driver',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    renderNavBar(mockUser);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Avatar should show initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should navigate to login when login button clicked', async () => {
    const user = userEvent.setup();
    renderNavBar();

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should navigate to map when logo clicked', async () => {
    const user = userEvent.setup();
    renderNavBar();

    await user.click(screen.getByText('ParkPal'));

    expect(mockNavigate).toHaveBeenCalledWith('/map');
  });

  it('should open menu when avatar clicked', async () => {
    const user = userEvent.setup();
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
      role: 'driver',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    renderNavBar(mockUser);

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    const avatar = screen.getByLabelText(/account of current user/i);
    await user.click(avatar);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should show dashboard menu item for host users', async () => {
    const user = userEvent.setup();
    const mockUser: User = {
      id: 1,
      email: 'host@example.com',
      name: 'Host User',
      role: 'host',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    renderNavBar(mockUser);

    await waitFor(() => {
      expect(screen.getByText('HU')).toBeInTheDocument();
    });

    const avatar = screen.getByLabelText(/account of current user/i);
    await user.click(avatar);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should navigate to profile when profile menu clicked', async () => {
    const user = userEvent.setup();
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
      role: 'driver',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    renderNavBar(mockUser);

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    const avatar = screen.getByLabelText(/account of current user/i);
    await user.click(avatar);

    const profileItem = screen.getByText('Profile');
    await user.click(profileItem);

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('should navigate to host dashboard when dashboard clicked for host', async () => {
    const user = userEvent.setup();
    const mockUser: User = {
      id: 1,
      email: 'host@example.com',
      name: 'Host User',
      role: 'host',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    renderNavBar(mockUser);

    await waitFor(() => {
      expect(screen.getByText('HU')).toBeInTheDocument();
    });

    const avatar = screen.getByLabelText(/account of current user/i);
    await user.click(avatar);

    const dashboardItem = screen.getByText('Dashboard');
    await user.click(dashboardItem);

    expect(mockNavigate).toHaveBeenCalledWith('/host-dashboard');
  });

  it('should logout and redirect when logout clicked', async () => {
    const user = userEvent.setup();
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
      role: 'driver',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    renderNavBar(mockUser);

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    const avatar = screen.getByLabelText(/account of current user/i);
    await user.click(avatar);

    const logoutItem = screen.getByText('Logout');
    await user.click(logoutItem);

    // Should clear localStorage
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();

    // Should navigate to login
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
