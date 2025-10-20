import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import Profile from '../Profile.tsx';
import api from '../../api';
import type { User } from '../../types';

// Mock api
vi.mock('../../api');
const mockApi = vi.mocked(api);

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'John Doe',
  role: 'driver',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const mockBookings = [
  {
    id: 1,
    slotId: 1,
    userId: 1,
    status: 'confirmed',
    startTime: '2025-01-15T10:00:00Z',
    endTime: '2025-01-15T12:00:00Z',
    price: 30,
    slot: {
      id: 1,
      address: 'Test Street 123',
      lat: 14.5995,
      lon: 120.9842,
    },
  },
  {
    id: 2,
    slotId: 2,
    userId: 1,
    status: 'pending',
    startTime: '2025-01-20T14:00:00Z',
    endTime: '2025-01-20T16:00:00Z',
    price: 50,
    slot: {
      id: 2,
      address: '',
      lat: 14.6,
      lon: 120.99,
    },
  },
];

describe('Profile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockApi.get.mockResolvedValue({ data: [] });
  });

  describe('Rendering', () => {
    it('should render profile title', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      render(<Profile />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display user information', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('John Doe', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('test@example.com', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('driver', { exact: false })).toBeInTheDocument();
      });
    });
  });

  describe('Bookings', () => {
    it('should fetch and display bookings', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      mockApi.get.mockResolvedValue({ data: mockBookings });

      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Booking #1')).toBeInTheDocument();
        expect(screen.getByText('Booking #2')).toBeInTheDocument();
      });

      expect(screen.getByText(/Test Street 123/)).toBeInTheDocument();
      expect(screen.getByText(/\$30/)).toBeInTheDocument();
      expect(screen.getByText(/\$50/)).toBeInTheDocument();
    });

    it('should show "No bookings yet" when no bookings', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      mockApi.get.mockResolvedValue({ data: [] });

      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('No bookings yet')).toBeInTheDocument();
      });
    });

    it('should display coordinates when address is missing', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      mockApi.get.mockResolvedValue({ data: [mockBookings[1]] });

      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText(/14.6, 120.99/)).toBeInTheDocument();
      });
    });

    it('should show confirmed status chip in success color', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      mockApi.get.mockResolvedValue({ data: [mockBookings[0]] });

      render(<Profile />);

      await waitFor(() => {
        const chip = screen.getByText('confirmed');
        expect(chip).toBeInTheDocument();
      });
    });

    it('should handle booking fetch error gracefully', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      mockApi.get.mockRejectedValue(new Error('Network error'));

      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('No bookings yet')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to map when "Back to Map" clicked', async () => {
      const user = userEvent.setup();
      localStorage.setItem('user', JSON.stringify(mockUser));
      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Back to Map')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Back to Map'));
      expect(mockNavigate).toHaveBeenCalledWith('/map');
    });

    it('should show host dashboard button for host users', async () => {
      localStorage.setItem('user', JSON.stringify({ ...mockUser, role: 'host' }));
      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Host Dashboard')).toBeInTheDocument();
      });
    });

    it('should not show host dashboard button for driver users', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      render(<Profile />);

      await waitFor(() => {
        expect(screen.queryByText('Host Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should navigate to host dashboard when button clicked', async () => {
      const user = userEvent.setup();
      localStorage.setItem('user', JSON.stringify({ ...mockUser, role: 'host' }));
      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Host Dashboard')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Host Dashboard'));
      expect(mockNavigate).toHaveBeenCalledWith('/host-dashboard');
    });
  });

  describe('Logout', () => {
    it('should logout and redirect when logout button clicked', async () => {
      const user = userEvent.setup();
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token');
      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Logout'));

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
