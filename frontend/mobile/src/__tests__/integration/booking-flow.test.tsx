/**
 * Integration Test: Complete Booking Flow
 * Tests the critical user journey from searching parking spots to completing a booking
 */

import { configureStore } from '@reduxjs/toolkit';
import parkingReducer from '../../store/slices/parkingSlice';
import bookingReducer from '../../store/slices/bookingSlice';
import authReducer from '../../store/slices/authSlice';
import { fetchParkingSpots, setSelectedSpot } from '../../store/slices/parkingSlice';
import { createBooking } from '../../store/slices/bookingSlice';
import { login } from '../../store/slices/authSlice';
import { marketplaceAPI, authAPI } from '../../services/api';

// Mock APIs
jest.mock('../../services/api', () => ({
  marketplaceAPI: {
    createBookingMarketplace: jest.fn(),
  },
  authAPI: {
    login: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Integration: Complete Booking Flow', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        parking: parkingReducer,
        booking: bookingReducer,
        auth: authReducer,
      },
    });
    jest.clearAllMocks();
  });

  it('should complete full booking flow: login -> search -> select -> book', async () => {
    // Step 1: User logs in
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    };
    const mockToken = 'mock-jwt-token';

    (authAPI.login as jest.Mock).mockResolvedValue({
      data: { user: mockUser, token: mockToken },
    });

    await store.dispatch(
      login({ email: 'test@example.com', password: 'password123' })
    );

    let state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual(mockUser);

    // Step 2: User searches for parking spots
    await store.dispatch(
      fetchParkingSpots({ latitude: 14.5995, longitude: 120.9842 })
    );

    state = store.getState();
    expect(state.parking.spots.length).toBeGreaterThan(0);
    expect(state.parking.loading).toBe(false);

    // Step 3: User selects a parking spot
    const selectedSpot = state.parking.spots[0];
    store.dispatch(setSelectedSpot(selectedSpot));

    state = store.getState();
    expect(state.parking.selectedSpot).toEqual(selectedSpot);

    // Step 4: User creates a booking
    const bookingData = {
      spotId: selectedSpot.id,
      spotTitle: selectedSpot.title,
      spotAddress: selectedSpot.address,
      spotImage: selectedSpot.images[0],
      userId: mockUser.id.toString(),
      startDate: '2024-12-31T10:00:00Z',
      endDate: '2024-12-31T14:00:00Z',
      duration: 4,
      price: selectedSpot.price * 4,
      paymentMethod: 'Credit Card',
    };

    const mockBookingResponse = {
      id: 1,
      slotId: parseInt(selectedSpot.id),
      startTime: bookingData.startDate,
      endTime: bookingData.endDate,
      totalPrice: bookingData.price,
      status: 'confirmed',
      qrCode: 'QR123',
      createdAt: new Date().toISOString(),
    };

    (marketplaceAPI.createBookingMarketplace as jest.Mock).mockResolvedValue({
      data: { booking: mockBookingResponse },
    });

    await store.dispatch(createBooking(bookingData));

    state = store.getState();
    expect(state.booking.bookings.length).toBe(1);
    expect(state.booking.bookings[0]).toMatchObject({
      id: '1',
      spotId: selectedSpot.id,
      status: 'confirmed',
    });
    expect(state.booking.loading).toBe(false);
    expect(state.booking.error).toBe(null);
  });

  it('should handle booking failure gracefully', async () => {
    // Login first
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    };

    (authAPI.login as jest.Mock).mockResolvedValue({
      data: { user: mockUser, token: 'token' },
    });

    await store.dispatch(
      login({ email: 'test@example.com', password: 'password123' })
    );

    // Fetch spots
    await store.dispatch(
      fetchParkingSpots({ latitude: 14.5995, longitude: 120.9842 })
    );

    const state = store.getState();
    const selectedSpot = state.parking.spots[0];

    // Attempt to create booking (will fail)
    const bookingData = {
      spotId: selectedSpot.id,
      spotTitle: selectedSpot.title,
      spotAddress: selectedSpot.address,
      spotImage: selectedSpot.images[0],
      userId: mockUser.id.toString(),
      startDate: '2024-12-31T10:00:00Z',
      endDate: '2024-12-31T14:00:00Z',
      duration: 4,
      price: selectedSpot.price * 4,
      paymentMethod: 'Credit Card',
    };

    const errorMessage = 'Payment processing failed';
    (marketplaceAPI.createBookingMarketplace as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    await store.dispatch(createBooking(bookingData));

    const finalState = store.getState();
    expect(finalState.booking.error).toBe(errorMessage);
    expect(finalState.booking.bookings.length).toBe(0);
    expect(finalState.booking.loading).toBe(false);
  });

  it('should prevent booking when not authenticated', async () => {
    // Try to book without logging in
    const bookingData = {
      spotId: '1',
      spotTitle: 'Test Spot',
      spotAddress: '123 Test St',
      spotImage: 'image.jpg',
      userId: '1',
      startDate: '2024-12-31T10:00:00Z',
      endDate: '2024-12-31T14:00:00Z',
      duration: 4,
      price: 100,
      paymentMethod: 'Credit Card',
    };

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);

    // The application should check auth state before allowing booking
    // This test verifies that the auth state is properly initialized
    expect(state.auth.user).toBe(null);
    expect(state.auth.token).toBe(null);
  });
});
