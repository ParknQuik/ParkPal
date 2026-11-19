import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Reservation from '../Reservation';
import api from '../../api';

vi.mock('../../api');
const mockNavigate = vi.fn();
let standing: { totalStrikes: number; isSuspended: boolean; suspendedUntil: string | null } = { totalStrikes: 0, isSuspended: false, suspendedUntil: null };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: {
      slot: { id: 41, title: 'Quiet side street', address: '41 Test Road', price: 80 },
      checkIn: '2030-01-01T10:00', checkOut: '2030-01-01T12:00',
      mapReturn: '/map?lat=14.6&lng=120.98', mapCenter: { lat: 14.62, lng: 120.99 }, mapZoom: 15,
      mapBounds: { south: 14.61, west: 120.98, north: 14.63, east: 121 },
    }, search: '' }),
  };
});

describe('Reservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    standing = { totalStrikes: 0, isSuspended: false, suspendedUntil: null };
    vi.mocked(api.get).mockImplementation(async (path) => path === '/vehicles'
      ? { data: [{ id: 7, make: 'Toyota', model: 'Vios', year: 2023, color: 'Silver', licensePlate: 'ABC-1234', isDefault: true }] } as never
      : { data: standing } as never);
  });

  it('submits a reservation draft with the selected vehicle and fixed-time details', async () => {
    render(<BrowserRouter><Reservation /></BrowserRouter>);
    await screen.findByLabelText('Vehicle');
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment choice' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/payment', expect.objectContaining({
      state: expect.objectContaining({ bookingDraft: expect.objectContaining({
        slotId: 41, rentalMode: 'fixed', vehicleId: 7,
        startTime: new Date('2030-01-01T10:00').toISOString(),
        endTime: new Date('2030-01-01T12:00').toISOString(),
      }) }),
    })));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows booking standing and blocks a suspended driver', async () => {
    standing = { totalStrikes: 3, isSuspended: true, suspendedUntil: '2030-01-02T00:00:00Z' };
    render(<BrowserRouter><Reservation /></BrowserRouter>);
    expect(await screen.findByText('Booking paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to payment choice' })).toBeDisabled();
  });

  it('returns to the selected map area from a map reservation', async () => {
    render(<BrowserRouter><Reservation /></BrowserRouter>);
    await screen.findByLabelText('Vehicle');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(mockNavigate).toHaveBeenCalledWith('/map?lat=14.6&lng=120.98', { state: {
      mapCenter: { lat: 14.62, lng: 120.99 }, mapZoom: 15,
      mapBounds: { south: 14.61, west: 120.98, north: 14.63, east: 121 },
    } });
  });
});
