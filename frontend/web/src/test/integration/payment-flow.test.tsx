import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Payment from '../../screens/Payment';
import api from '../../api';

vi.mock('../../api');
const mockNavigate = vi.fn();
const mockBooking = { id: 123, price: 50, platformFee: 2.5, slot: { address: '12 Test Street' }, startTime: '2030-12-31T10:00:00Z', endTime: '2030-12-31T14:00:00Z' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ state: { booking: mockBooking }, search: '' }) };
});

describe('PayMongo checkout flow', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.mocked(api.get).mockResolvedValue({ data: {} } as never); });

  it('attaches the public payment method and only navigates after backend confirmation', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { paymentIntentId: 'pi_sandbox', clientKey: 'client_key', publicKey: 'pk_test' } } as never)
      .mockResolvedValueOnce({ data: { status: 'completed' } } as never);
    const browserFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'pm_sandbox' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { status: 'succeeded' } } }) });
    vi.stubGlobal('fetch', browserFetch);

    render(<BrowserRouter><Payment /></BrowserRouter>);
    expect(screen.getByText('₱52.50')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reserve and pay · ₱52.50' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/payments/intent', { bookingId: 123, paymentMethod: 'gcash' }));
    expect(browserFetch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/payments/confirm', { paymentIntentId: 'pi_sandbox' }));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/123');
  });

  it('keeps pending payments on checkout and does not navigate as if confirmed', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { paymentIntentId: 'pi_waiting', clientKey: 'client_key', publicKey: 'pk_test' } } as never)
      .mockResolvedValueOnce({ data: { status: 'pending' } } as never);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'pm_sandbox' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { status: 'processing' } } }) }));
    render(<BrowserRouter><Payment /></BrowserRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Reserve and pay · ₱52.50' }));
    expect(await screen.findByText(/Payment is still pending/)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
