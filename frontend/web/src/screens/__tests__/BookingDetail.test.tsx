import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingDetail from '../BookingDetail';
import api from '../../api';

vi.mock('../../api');
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderDetail = () => render(<MemoryRouter initialEntries={['/bookings/22']}><Routes><Route path="/bookings/:id" element={<BookingDetail />} /></Routes></MemoryRouter>);

describe('BookingDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows actual open-time cash due and sends QR steps to the mobile app', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: {
      id: 22, rentalMode: 'open', maxDuration: 12, status: 'completed',
      startTime: '2030-01-01T10:00:00Z', endTime: '2030-01-01T12:00:00Z',
      slot: { address: '22 Market Road' }, vehicle: { make: 'Toyota', model: 'Vios', year: 2023, color: 'Silver', licensePlate: 'ABC-1234' },
      payments: [{ paymentMethod: 'cash', status: 'pending', amount: 168, capturedParkingAmount: 160, platformFeeAmount: 8 }],
    } } as never);

    renderDetail();
    expect(await screen.findByText((_, element) => element?.textContent === 'Cash due to host: ₱168.00')).toBeInTheDocument();
    expect(screen.getByText(/scan the QR code at the parking space/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open booking in mobile app' })).toHaveAttribute('href', 'parknquik://booking/22');
    expect(screen.queryByRole('button', { name: 'Extend fixed booking' })).not.toBeInTheDocument();
  });

  it('offers fixed booking extensions after checking availability', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: {
      id: 22, rentalMode: 'fixed', status: 'confirmed', startTime: '2030-01-01T10:00:00Z', endTime: '2030-01-01T12:00:00Z',
      slot: { address: '22 Market Road' }, payments: [{ paymentMethod: 'gcash', status: 'completed', amount: 100 }],
    } } as never).mockResolvedValueOnce({ data: {
      available: true, requestedEndTime: '2030-01-01T13:00:00Z', pricing: { total: 94 },
    } } as never);
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: 'Extend fixed booking' }));
    expect(await screen.findByText(/Extension total: ₱94.00/)).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/marketplace/bookings/22/extension-availability', { params: { hours: 1 } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pay and extend' })).toBeEnabled());
  });
});
