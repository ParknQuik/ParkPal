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
    vi.mocked(mockApi.get).mockResolvedValue({ data: [] });
  });

  describe('Rendering', () => {
    it('links to Perks', async () => {
      const user = userEvent.setup();
      localStorage.setItem('user', JSON.stringify(mockUser));
      render(<Profile />);
      await user.click(await screen.findByRole('button', { name: 'View perks' }));
      expect(mockNavigate).toHaveBeenCalledWith('/perks');
    });

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

  describe('Profile editor', () => {
    it('opens with account details and saves changes', async () => {
      const user = userEvent.setup();
      localStorage.setItem('user', JSON.stringify(mockUser));
      vi.mocked(mockApi.patch).mockResolvedValue({ data: { ...mockUser, name: 'Jane Doe', phone: '12345' } });
      render(<Profile />);
      await user.click(await screen.findByRole('button', { name: /edit profile/i }));
      expect(screen.getByRole('dialog', { name: /edit profile/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeDisabled();
      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/phone/i), '12345');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith('/users/profile', { name: 'Jane Doe', phone: '12345' }));
      expect(await screen.findByText('Profile updated successfully')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('validates the name and reports save errors', async () => {
      const user = userEvent.setup();
      localStorage.setItem('user', JSON.stringify(mockUser));
      vi.mocked(mockApi.patch).mockRejectedValue({ response: { data: { error: 'Unable to save' } } });
      render(<Profile />);
      await user.click(await screen.findByRole('button', { name: /edit profile/i }));
      await user.clear(screen.getByLabelText(/name/i));
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(mockApi.patch).not.toHaveBeenCalled();
      await user.type(screen.getByLabelText(/name/i), 'Jane');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      expect(await screen.findByText('Unable to save')).toBeInTheDocument();
    });

    it('reports an invalid photo selection', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      render(<Profile />);
      const input = await screen.findByLabelText('Choose profile photo');
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(input, { target: { files: [new File(['text'], 'bad.txt', { type: 'text/plain' })] } });
      expect(await screen.findByText('Choose a valid image file.')).toBeInTheDocument();
    });

    it('uploads a photo through the development proxy and confirms only successful PUTs', async () => {
      const { act, fireEvent } = await import('@testing-library/react');
      const originalImage = globalThis.Image;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:profile-photo');
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never);
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })));
      globalThis.Image = class {
        naturalWidth = 1;
        naturalHeight = 1;
        onload: ((event: Event) => void) | null = null;
        set src(_value: string) { this.onload?.call(this, new Event('load')); }
      } as unknown as typeof Image;
      let finishUpload: (() => void) | undefined;
      let progressHandler: ((event: ProgressEvent) => void) | null = null;
      const upload = Object.defineProperty({}, 'onprogress', {
        get: () => progressHandler,
        set: (handler: ((event: ProgressEvent) => void) | null) => { progressHandler = handler; }
      });
      const request = { onload: null as (() => void) | null };
      let uploadStatus = 200;
      const send = vi.fn(() => { finishUpload = () => request.onload?.(); });
      const open = vi.fn();
      const setRequestHeader = vi.fn();
      vi.stubGlobal('XMLHttpRequest', vi.fn(function () {
        return { open, setRequestHeader, send, upload, get onload() { return request.onload; }, set onload(value) { request.onload = value; }, get status() { return uploadStatus; } };
      }));
      localStorage.setItem('user', JSON.stringify(mockUser));
      const signedUrl = 'https://storage.googleapis.com/parkpal-dev-photos/profile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=abc%2F123';
      vi.mocked(mockApi.get).mockImplementation(async (url) => url === '/users/profile/upload-url'
        ? { data: { uploadUrl: signedUrl, fileName: 'profile.jpg' } }
        : { data: [] } as never);
      vi.mocked(mockApi.patch).mockResolvedValue({ data: { ...mockUser, profileImageUrl: 'https://cdn.example/profile.jpg' } });

      try {
        render(<Profile />);
        const input = await screen.findByLabelText('Choose profile photo');
        fireEvent.change(input, { target: { files: [new File(['image'], 'profile.png', { type: 'image/png' })] } });
        await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/users/profile/upload-url', expect.anything()));
        await waitFor(() => expect(send).toHaveBeenCalled());
        expect(mockApi.patch).not.toHaveBeenCalled();
        act(() => (progressHandler as ((event: ProgressEvent) => void) | null)?.({ lengthComputable: true, loaded: 1, total: 1 } as ProgressEvent));
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('100%'));
        expect(mockApi.patch).not.toHaveBeenCalled();
        await act(async () => finishUpload?.());
        expect(await screen.findByText('Profile photo updated.')).toBeInTheDocument();
        expect(mockApi.get).toHaveBeenCalledWith('/users/profile/upload-url', expect.objectContaining({
          params: expect.objectContaining({ contentType: 'image/jpeg' })
        }));
        expect(open).toHaveBeenCalledWith('PUT', '/__profile-photo-storage/parkpal-dev-photos/profile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=abc%2F123');
        expect(setRequestHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
        expect(send).toHaveBeenCalledWith(expect.any(Blob));
        expect(mockApi.patch).toHaveBeenCalledWith('/users/profile/upload', { fileName: 'profile.jpg' });

        fireEvent.change(input, { target: { files: [new File(['image'], 'second.png', { type: 'image/png' })] } });
        await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
        uploadStatus = 403;
        await act(async () => finishUpload?.());
        expect(await screen.findByText('Photo upload failed. Please try again.')).toBeInTheDocument();
        expect(mockApi.patch).toHaveBeenCalledTimes(1);

        vi.stubEnv('DEV', false);
        fireEvent.change(input, { target: { files: [new File(['image'], 'third.png', { type: 'image/png' })] } });
        await waitFor(() => expect(send).toHaveBeenCalledTimes(3));
        expect(open).toHaveBeenLastCalledWith('PUT', signedUrl);
      } finally {
        globalThis.Image = originalImage;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
      }
    });
  });

  describe('Bookings', () => {
    it('should fetch and display bookings', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      vi.mocked(mockApi.get).mockResolvedValue({ data: mockBookings } as never);

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
      vi.mocked(mockApi.get).mockResolvedValue({ data: [] });

      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText('No bookings yet')).toBeInTheDocument();
      });
    });

    it('should display coordinates when address is missing', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      vi.mocked(mockApi.get).mockResolvedValue({ data: [mockBookings[1]] } as never);

      render(<Profile />);

      await waitFor(() => {
        expect(screen.getByText(/14.6, 120.99/)).toBeInTheDocument();
      });
    });

    it('should show confirmed status chip in success color', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      vi.mocked(mockApi.get).mockResolvedValue({ data: [mockBookings[0]] } as never);

      render(<Profile />);

      await waitFor(() => {
        const chip = screen.getByText('confirmed');
        expect(chip).toBeInTheDocument();
      });
    });

    it('should handle booking fetch error gracefully', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      vi.mocked(mockApi.get).mockRejectedValue(new Error('Network error'));

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

    it('shows host stats and dashboard link for a driver with host capability', async () => {
      localStorage.setItem('user', JSON.stringify({ ...mockUser, canHost: true }));
      vi.mocked(mockApi.get)
        .mockResolvedValueOnce({ data: mockBookings })
        .mockResolvedValueOnce({ data: { totalBookings: 2, activeBookings: 1, completedBookings: 1, totalSpent: 80, totalListings: 1, totalEarnings: 0, totalHostBookings: 0 } });
      render(<Profile />);
      await waitFor(() => expect(screen.getByText('Host Dashboard')).toBeInTheDocument());
      expect(screen.getByText('Listings')).toBeInTheDocument();
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
