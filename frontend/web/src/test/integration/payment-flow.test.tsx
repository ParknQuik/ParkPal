import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Payment from '../../screens/Payment';
import api from '../../api';

// Mock the API
vi.mock('../../api');

/**
 * Integration Test: Complete Payment Flow
 *
 * Tests the end-to-end payment flow from reservation to payment confirmation
 */
describe('Payment Flow Integration Test', () => {
  const mockBooking = {
    id: 123,
    price: 50,
    slotId: 456,
    startTime: '2025-12-31T10:00:00Z',
    endTime: '2025-12-31T14:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full payment flow successfully', async () => {
    // Mock successful API responses
    const mockPost = vi.mocked(api.post);

    // Step 1: Payment intent creation
    mockPost.mockResolvedValueOnce({
      data: {
        paymentIntentId: 'pi_test_123',
        clientKey: 'key_test_123',
      },
    });

    // Step 2: Payment confirmation
    mockPost.mockResolvedValueOnce({
      data: {
        status: 'succeeded',
        paymentId: 'payment_123',
      },
    });

    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({
          state: { booking: mockBooking },
        }),
      };
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                {/* Mock location state */}
                <Payment />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    );

    // Verify initial state
    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    expect(screen.getByText('Booking Summary')).toBeInTheDocument();

    // Verify booking details
    expect(screen.getByText(`#${mockBooking.id}`)).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();

    // Select payment method (default is GCash)
    const gcashOption = screen.getByText('GCash');
    expect(gcashOption).toBeInTheDocument();

    // Click pay button
    const payButton = screen.getByRole('button', { name: /Pay \$52.00/i });
    expect(payButton).toBeEnabled();

    fireEvent.click(payButton);

    // Verify button is disabled during processing
    await waitFor(() => {
      expect(payButton).toBeDisabled();
    });

    // Verify payment intent API call
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/v1/payments/intent', {
        bookingId: mockBooking.id,
        amount: 5000, // $50 * 100
        paymentMethod: 'gcash',
      });
    });

    // Verify payment confirmation API call
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/v1/payments/confirm', {
        paymentIntentId: 'pi_test_123',
      });
    });

    // Verify processing steps are shown
    await waitFor(() => {
      expect(screen.getByText(/Payment successful!/i)).toBeInTheDocument();
    });
  });

  it('should handle payment method selection', async () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <Payment />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    );

    // Select different payment methods
    const cardRadio = screen.getAllByRole('radio')[1];
    fireEvent.click(cardRadio);
    expect(cardRadio).toBeChecked();

    const grabPayRadio = screen.getAllByRole('radio')[2];
    fireEvent.click(grabPayRadio);
    expect(grabPayRadio).toBeChecked();

    const payMayaRadio = screen.getAllByRole('radio')[3];
    fireEvent.click(payMayaRadio);
    expect(payMayaRadio).toBeChecked();
  });

  it('should display error on payment intent failure', async () => {
    const mockPost = vi.mocked(api.post);
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Insufficient funds',
        },
      },
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Payment />} />
        </Routes>
      </BrowserRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay \$52.00/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
    });
  });

  it('should display error on payment confirmation failure', async () => {
    const mockPost = vi.mocked(api.post);

    // Payment intent succeeds
    mockPost.mockResolvedValueOnce({
      data: {
        paymentIntentId: 'pi_test_123',
        clientKey: 'key_test_123',
      },
    });

    // Payment confirmation fails
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Payment declined by bank',
        },
      },
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Payment />} />
        </Routes>
      </BrowserRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay \$52.00/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Payment declined by bank')).toBeInTheDocument();
    });
  });

  it('should calculate total price correctly', () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Payment />} />
        </Routes>
      </BrowserRouter>
    );

    // Parking fee: $50
    expect(screen.getByText('$50')).toBeInTheDocument();

    // Service fee: $2.00
    expect(screen.getByText('$2.00')).toBeInTheDocument();

    // Total: $52.00
    expect(screen.getByText('$52.00')).toBeInTheDocument();
  });

  it('should show demo mode alert', () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Payment />} />
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/PayMongo test environment/i)).toBeInTheDocument();
  });

  it('should allow user to cancel payment', () => {
    // Note: mockNavigate would be used to verify navigation in a full integration test
    // const mockNavigate = vi.fn();

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Payment />} />
        </Routes>
      </BrowserRouter>
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeEnabled();

    fireEvent.click(cancelButton);
    // Navigation would occur here in actual app
  });
});
