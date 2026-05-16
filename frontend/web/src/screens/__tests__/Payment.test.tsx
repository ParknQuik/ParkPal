import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Payment from '../Payment';
import api from '../../api';

// Mock the API module
vi.mock('../../api');

// Mock useNavigate
const mockNavigate = vi.fn();
let mockLocationState: { booking?: { id: number; price: number } } = {
  booking: {
    id: 123,
    price: 50,
  },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

describe('Payment Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockLocationState = {
      booking: {
        id: 123,
        price: 50,
      },
    };
  });

  it('renders payment methods correctly', () => {
    render(
      <BrowserRouter>
        <Payment />
      </BrowserRouter>
    );

    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    expect(screen.getByText('GCash')).toBeInTheDocument();
    expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
    expect(screen.getByText('GrabPay')).toBeInTheDocument();
    expect(screen.getByText('PayMaya')).toBeInTheDocument();
  });

  it('displays booking summary with correct total', () => {
    render(
      <BrowserRouter>
        <Payment />
      </BrowserRouter>
    );

    expect(screen.getByText('Booking Summary')).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText('$52.00')).toBeInTheDocument(); // Total with service fee
  });

  it('allows selecting different payment methods', () => {
    render(
      <BrowserRouter>
        <Payment />
      </BrowserRouter>
    );

    const grabPayRadio = screen.getAllByRole('radio')[2];
    fireEvent.click(grabPayRadio);

    expect(grabPayRadio).toBeChecked();
  });

  it('handles successful payment intent creation', async () => {
    const mockPost = vi.mocked(api.post);
    mockPost.mockResolvedValueOnce({
      data: {
        paymentIntentId: 'pi_123',
        clientKey: 'key_123',
      },
    });

    render(
      <BrowserRouter>
        <Payment />
      </BrowserRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay \$52.00/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/v1/payments/intent', {
        bookingId: 123,
        amount: 5000,
        paymentMethod: 'gcash',
      });
    });
  });

  it('displays error message on payment failure', async () => {
    const mockPost = vi.mocked(api.post);
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Payment failed',
        },
      },
    });

    render(
      <BrowserRouter>
        <Payment />
      </BrowserRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay \$52.00/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
    });
  });

  it('disables pay button while processing', async () => {
    const mockPost = vi.mocked(api.post);
    mockPost.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <BrowserRouter>
        <Payment />
      </BrowserRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay \$52.00/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(payButton).toBeDisabled();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('shows error when no booking is provided', () => {
    mockLocationState = {};

    render(
      <BrowserRouter>
        <Payment />
      </BrowserRouter>
    );

    expect(screen.getByText(/No booking found/i)).toBeInTheDocument();
  });
});
