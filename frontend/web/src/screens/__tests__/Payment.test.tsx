import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Payment from '../Payment';
import api from '../../api';

vi.mock('../../api');

const mockNavigate = vi.fn();
let booking: Record<string, unknown> | null = { id: 123, price: 50, platformFee: 2.5, startTime: '2030-01-01T10:00:00Z', endTime: '2030-01-01T11:00:00Z' };
let bookingDraft: Record<string, unknown> | null = null;
let slot: Record<string, unknown> | null = null;
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ state: { booking, bookingDraft, slot }, search: '' }) };
});

const renderPayment = () => render(<BrowserRouter><Payment /></BrowserRouter>);

describe('Payment screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEV', true);
    booking = { id: 123, price: 50, platformFee: 2.5, status: 'pending', startTime: '2030-01-01T10:00:00Z', endTime: '2030-01-01T11:00:00Z' };
    bookingDraft = null;
    slot = null;
    vi.mocked(api.get).mockResolvedValue({ data: {} } as never);
  });

  afterEach(() => vi.unstubAllEnvs());

  it('shows the PHP booking total and available payment methods', () => {
    renderPayment();
    expect(screen.getByText('Choose how to pay')).toBeInTheDocument();
    expect(screen.getByText('₱52.50')).toBeInTheDocument();
    expect(screen.getByText('GCash')).toBeInTheDocument();
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('Credit or debit card')).toBeInTheDocument();
  });

  it('simulates a development confirmation and opens booking detail', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { message: 'Development booking confirmed' } } as never);
    renderPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate booking confirmation (dev)' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/marketplace/bookings/123/dev-confirm'));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/123');
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('shows development confirmation errors and stays on checkout', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { data: { error: 'Only pending bookings can be confirmed' } } });
    renderPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate booking confirmation (dev)' }));
    expect(await screen.findByText('Only pending bookings can be confirmed')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides development confirmation outside Vite development mode', () => {
    vi.stubEnv('DEV', false);
    renderPayment();
    expect(screen.queryByRole('button', { name: 'Simulate booking confirmation (dev)' })).not.toBeInTheDocument();
  });

  it('sends the booking id without a client amount and reports backend-confirmed success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { paymentIntentId: 'pi_test', clientKey: 'client', publicKey: 'pk_test' } } as never)
      .mockResolvedValueOnce({ data: { status: 'completed' } } as never);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'pm_test' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { status: 'succeeded' } } }) });
    vi.stubGlobal('fetch', fetchMock);

    renderPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Reserve and pay · ₱52.50' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/payments/intent', { bookingId: 123, paymentMethod: 'gcash' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/payments/confirm', { paymentIntentId: 'pi_test' }));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/123');
  });

  it('keeps a pending result from being shown as successful', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { paymentIntentId: 'pi_pending', clientKey: 'client', publicKey: 'pk_test' } } as never)
      .mockResolvedValueOnce({ data: { status: 'pending' } } as never);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'pm_test' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { status: 'processing' } } }) }));
    renderPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Reserve and pay · ₱52.50' }));
    expect(await screen.findByText(/Payment is still pending/)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an object-shaped intent error safely and keeps checkout usable', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { data: { error: { message: 'Booking already paid' } } } });
    renderPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Reserve and pay · ₱52.50' }));
    expect(await screen.findByText('Booking already paid')).toBeInTheDocument();
    expect(screen.getByText('Choose how to pay')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a cancelled state without treating the booking as successful', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { paymentIntentId: 'pi_cancelled', clientKey: 'client', publicKey: 'pk_test' } } as never)
      .mockResolvedValueOnce({ data: { status: 'cancelled' } } as never);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'pm_test' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { status: 'canceled' } } }) }));
    renderPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Reserve and pay · ₱52.50' }));
    expect(await screen.findByText(/Payment was cancelled/)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('verifies provider redirect returns with the backend before navigating', async () => {
    window.history.pushState({}, '', '/?bookingId=123&payment_intent_id=pi_return');
    vi.mocked(api.post).mockResolvedValueOnce({ data: { status: 'authorized' } } as never);
    renderPayment();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/payments/confirm', { paymentIntentId: 'pi_return' }));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/123', { replace: true });
    window.history.pushState({}, '', '/');
  });

  it('shows a clear message when there is no booking to pay', () => {
    booking = null;
    renderPayment();
    expect(screen.getByText(/No booking or reservation found/)).toBeInTheDocument();
  });

  it('creates the pending booking with its selected vehicle only after cash is submitted', async () => {
    booking = null;
    bookingDraft = { slotId: 55, startTime: '2030-01-01T10:00:00Z', endTime: '2030-01-01T11:00:00Z', rentalMode: 'fixed', vehicleId: 7 };
    slot = { id: 55, address: '7 Test Street', price: 50 };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { booking: { id: 456, price: 50, platformFee: 2.5 } } } as never)
      .mockResolvedValueOnce({ data: { paymentIntentId: 'cash_test', amount: 52.5 } } as never)
      .mockResolvedValueOnce({ data: { booking: { id: 456, status: 'confirmed' } } } as never);
    renderPayment();
    fireEvent.click(screen.getByLabelText('Cash'));
    fireEvent.click(screen.getByRole('button', { name: 'Reserve and choose cash' }));

    await waitFor(() => expect(api.post).toHaveBeenNthCalledWith(1, '/marketplace/bookings', bookingDraft));
    expect(api.post).toHaveBeenNthCalledWith(2, '/payments/intent', { bookingId: 456, paymentMethod: 'cash' });
    expect(api.post).toHaveBeenNthCalledWith(3, '/payments/confirm', { paymentIntentId: 'cash_test' });
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/456');
  });
});
