import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MyBookingsScreen } from '../../screens/MyBookingsScreen';
import marketplaceReducer, { getMyBookings } from '../../store/slices/marketplaceSlice';

// Mock the API
jest.mock('../../services/api', () => ({
  marketplaceAPI: {
    getMyBookings: jest.fn(),
    checkExtensionAvailability: jest.fn(),
    extendBooking: jest.fn(),
    cancelBooking: jest.fn(),
  },
  paymentAPI: {
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const mockAlert = jest.spyOn(Alert, 'alert');

const createTestStore = (initialBookings: any[] = []) => {
  const store = configureStore({
    reducer: {
      marketplace: marketplaceReducer,
    },
  });
  
  // Set initial bookings if provided
  if (initialBookings.length > 0) {
    store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: initialBookings });
  }
  
  return store;
};

describe('MyBookingsScreen - Extension Feature', () => {
  const mockBooking = {
    id: 1,
    slotId: 1,
    listingTitle: 'Test Parking',
    listingAddress: '123 Test St',
    listingPhoto: null,
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    rentalMode: 'fixed',
    status: 'confirmed',
    totalAmount: 100,
    qrCode: 'QR123',
  };

  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();
    
    const { marketplaceAPI } = require('../../services/api');
    marketplaceAPI.getMyBookings.mockResolvedValue({
      data: { bookings: [mockBooking] },
    });
  });

  const renderWithStore = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        {component}
      </Provider>
    );
  };

  it('should show extend button for fixed duration bookings', async () => {
    const { getByText } = renderWithStore(<MyBookingsScreen />);

    // Manually dispatch to load bookings
    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [mockBooking] });
    });

    await waitFor(() => {
      expect(getByText('Extend Time')).toBeTruthy();
    });
  });

  it('should not show extend button for open time bookings', async () => {
    const openModeBooking = {
      ...mockBooking,
      rentalMode: 'open',
      endTime: null,
    };

    const { queryByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [openModeBooking] });
    });

    await waitFor(() => {
      expect(queryByText('Extend Time')).toBeNull();
    });
  });

  it('should not show extend button for past bookings', async () => {
    const pastBooking = {
      ...mockBooking,
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    };

    const { queryByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [pastBooking] });
    });

    await waitFor(() => {
      expect(queryByText('Extend Time')).toBeNull();
    });
  });

  it('should open extension modal when extend button is pressed', async () => {
    const { marketplaceAPI } = require('../../services/api');
    marketplaceAPI.checkExtensionAvailability.mockResolvedValue({
      data: {
        available: true,
        extensionHours: 1,
        requestedEndTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        pricing: {
          extensionCost: 50,
          serviceFee: 10,
          tax: 2.5,
          total: 62.5,
        },
      },
    });

    const { getByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [mockBooking] });
    });

    await waitFor(() => {
      expect(getByText('Extend Time')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Extend Time'));
    });

    await waitFor(() => {
      expect(getByText('Extend Booking Time')).toBeTruthy();
      expect(getByText('+1hr')).toBeTruthy();
      expect(getByText('+2hrs')).toBeTruthy();
    });
  });

  it('should check availability when hour selection changes', async () => {
    const { marketplaceAPI } = require('../../services/api');
    marketplaceAPI.checkExtensionAvailability.mockResolvedValue({
      data: {
        available: true,
        extensionHours: 2,
        requestedEndTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        pricing: {
          extensionCost: 100,
          serviceFee: 10,
          tax: 5,
          total: 115,
        },
      },
    });

    const { getByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [mockBooking] });
    });

    await act(async () => {
      fireEvent.press(getByText('Extend Time'));
    });

    await waitFor(() => {
      expect(getByText('+2hrs')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('+2hrs'));
    });

    await waitFor(() => {
      expect(marketplaceAPI.checkExtensionAvailability).toHaveBeenCalledWith(
        mockBooking.id,
        2
      );
    });
  });

  it('should show unavailable message when slot is booked', async () => {
    const { marketplaceAPI } = require('../../services/api');
    marketplaceAPI.checkExtensionAvailability
      .mockResolvedValueOnce({
        data: {
          available: true,
          extensionHours: 1,
          requestedEndTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          pricing: {
            extensionCost: 50,
            serviceFee: 10,
            tax: 2.5,
            total: 62.5,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          available: false,
          conflictingBooking: {
            startTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          },
        },
      });

    const { getByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [mockBooking] });
    });

    await act(async () => {
      fireEvent.press(getByText('Extend Time'));
    });

    await waitFor(() => {
      expect(getByText('+2hrs')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('+2hrs'));
    });

    await waitFor(() => {
      expect(getByText('Unavailable')).toBeTruthy();
      expect(getByText(/booked by another user/)).toBeTruthy();
    });
  });

  it('should process extension payment and refresh bookings', async () => {
    const { marketplaceAPI, paymentAPI } = require('../../services/api');
    
    marketplaceAPI.checkExtensionAvailability.mockResolvedValue({
      data: {
        available: true,
        extensionHours: 1,
        requestedEndTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        pricing: { 
          extensionCost: 50,
          serviceFee: 10,
          tax: 2.5,
          total: 62.5,
        },
      },
    });

    paymentAPI.createPaymentIntent.mockResolvedValue({
      data: { paymentIntentId: 'test_intent_123' },
    });

    paymentAPI.confirmPayment.mockResolvedValue({
      data: { status: 'completed' },
    });

    marketplaceAPI.extendBooking.mockResolvedValue({
      data: {
        booking: {
          ...mockBooking,
          extensionCount: 1,
        },
      },
    });

    const { getByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [mockBooking] });
    });

    await act(async () => {
      fireEvent.press(getByText('Extend Time'));
    });

    await waitFor(() => {
      expect(getByText(/Extend & Pay/)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText(/Extend & Pay/));
    });

    await waitFor(() => {
      expect(paymentAPI.createPaymentIntent).toHaveBeenCalled();
      expect(paymentAPI.confirmPayment).toHaveBeenCalled();
      expect(marketplaceAPI.extendBooking).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith(
        'Booking Extended!',
        expect.any(String)
      );
    });
  });

  it('should handle extension errors gracefully', async () => {
    const { marketplaceAPI, paymentAPI } = require('../../services/api');
    
    marketplaceAPI.checkExtensionAvailability.mockResolvedValue({
      data: {
        available: true,
        extensionHours: 1,
        requestedEndTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        pricing: { 
          extensionCost: 50,
          serviceFee: 10,
          tax: 2.5,
          total: 62.5,
        },
      },
    });

    paymentAPI.createPaymentIntent.mockRejectedValue({
      response: { data: { error: 'Payment failed' } },
    });

    const { getByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [mockBooking] });
    });

    await act(async () => {
      fireEvent.press(getByText('Extend Time'));
    });

    await waitFor(() => {
      expect(getByText(/Extend & Pay/)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText(/Extend & Pay/));
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Extension Failed',
        'Payment failed'
      );
    });
  });

  it('should display pricing breakdown in modal', async () => {
    const { marketplaceAPI } = require('../../services/api');
    marketplaceAPI.checkExtensionAvailability.mockResolvedValue({
      data: {
        available: true,
        extensionHours: 1,
        requestedEndTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        pricing: {
          extensionCost: 50,
          serviceFee: 10,
          tax: 2.5,
          total: 62.5,
        },
      },
    });

    const { getByText } = renderWithStore(<MyBookingsScreen />);

    await act(async () => {
      await store.dispatch({ type: 'marketplace/getMyBookings/fulfilled', payload: [mockBooking] });
    });

    await act(async () => {
      fireEvent.press(getByText('Extend Time'));
    });

    await waitFor(() => {
      expect(getByText('₱50.00')).toBeTruthy();
      expect(getByText('₱10.00')).toBeTruthy();
      expect(getByText('₱2.50')).toBeTruthy();
      expect(getByText('₱62.50')).toBeTruthy();
    });
  });
});
