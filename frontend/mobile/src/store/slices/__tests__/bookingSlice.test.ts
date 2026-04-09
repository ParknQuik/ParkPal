import { configureStore } from '@reduxjs/toolkit';
import bookingReducer, {
  fetchBookings,
  createBooking,
  cancelBooking,
  setActiveBooking,
} from '../bookingSlice';
import { marketplaceAPI } from '../../../services/api';

// Mock API
jest.mock('../../../services/api', () => ({
  marketplaceAPI: {
    getMyBookings: jest.fn(),
    createBookingMarketplace: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

describe('bookingSlice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        booking: bookingReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().booking;
      expect(state).toEqual({
        bookings: [],
        activeBooking: null,
        loading: false,
        error: null,
      });
    });
  });

  describe('fetchBookings', () => {
    const mockAPIBookings = [
      {
        id: 1,
        slotId: 10,
        userId: 5,
        startTime: '2024-12-31T10:00:00Z',
        endTime: '2024-12-31T14:00:00Z',
        price: 100,
        status: 'confirmed',
        createdAt: '2024-12-30T10:00:00Z',
        slot: {
          description: 'Downtown Parking',
          address: '123 Main St',
          photos: JSON.stringify(['photo1.jpg', 'photo2.jpg']),
          qrCode: 'QR123',
        },
      },
      {
        id: 2,
        slotId: 11,
        userId: 5,
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T14:00:00Z',
        price: 150,
        status: 'active',
        createdAt: '2024-12-30T11:00:00Z',
        slot: {
          description: 'Airport Parking',
          address: '456 Airport Rd',
          photos: JSON.stringify(['photo3.jpg']),
          qrCode: 'QR456',
        },
      },
    ];

    it('should fetch and transform bookings successfully', async () => {
      (marketplaceAPI.getMyBookings as jest.Mock).mockResolvedValue({
        data: { bookings: mockAPIBookings },
      });

      await store.dispatch(fetchBookings('5'));

      const state = store.getState().booking;
      expect(state.loading).toBe(false);
      expect(state.bookings).toHaveLength(2);
      expect(state.bookings[0]).toMatchObject({
        id: '1',
        spotId: '10',
        spotTitle: 'Downtown Parking',
        spotAddress: '123 Main St',
        spotImage: 'photo1.jpg',
        status: 'upcoming',
      });
      expect(state.bookings[1]).toMatchObject({
        id: '2',
        spotId: '11',
        spotTitle: 'Airport Parking',
        status: 'active',
      });
      expect(state.activeBooking).toEqual(state.bookings[1]);
    });

    it('should handle fetch failure', async () => {
      const errorMessage = 'Failed to fetch bookings';
      (marketplaceAPI.getMyBookings as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await store.dispatch(fetchBookings('5'));

      const state = store.getState().booking;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.bookings).toEqual([]);
    });

    it('should set loading state during fetch', () => {
      (marketplaceAPI.getMyBookings as jest.Mock).mockResolvedValue({
        data: { bookings: [] },
      });

      store.dispatch(fetchBookings('5'));

      const state = store.getState().booking;
      expect(state.loading).toBe(true);
    });
  });

  describe('createBooking', () => {
    const mockBookingData = {
      spotId: '10',
      spotTitle: 'Downtown Parking',
      spotAddress: '123 Main St',
      spotImage: 'photo1.jpg',
      userId: '5',
      startDate: '2024-12-31T10:00:00Z',
      endDate: '2024-12-31T14:00:00Z',
      duration: 4,
      price: 100,
      paymentMethod: 'Credit Card',
    };

    const mockAPIResponse = {
      id: 1,
      slotId: 10,
      startTime: '2024-12-31T10:00:00Z',
      endTime: '2024-12-31T14:00:00Z',
      totalPrice: 100,
      status: 'confirmed',
      qrCode: 'QR123',
      createdAt: '2024-12-30T10:00:00Z',
    };

    it('should create booking successfully', async () => {
      (marketplaceAPI.createBookingMarketplace as jest.Mock).mockResolvedValue({
        data: { booking: mockAPIResponse },
      });

      await store.dispatch(createBooking(mockBookingData));

      const state = store.getState().booking;
      expect(state.loading).toBe(false);
      expect(state.bookings).toHaveLength(1);
      expect(state.bookings[0]).toMatchObject({
        id: '1',
        spotId: '10',
        spotTitle: 'Downtown Parking',
        price: 100,
        status: 'confirmed',
      });
    });

    it('should handle creation failure', async () => {
      const errorMessage = 'Booking creation failed';
      (marketplaceAPI.createBookingMarketplace as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await store.dispatch(createBooking(mockBookingData));

      const state = store.getState().booking;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.bookings).toEqual([]);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      // First create a booking
      const mockAPIResponse = {
        id: 1,
        slotId: 10,
        startTime: '2024-12-31T10:00:00Z',
        endTime: '2024-12-31T14:00:00Z',
        totalPrice: 100,
        status: 'confirmed',
        qrCode: 'QR123',
        createdAt: '2024-12-30T10:00:00Z',
      };

      (marketplaceAPI.createBookingMarketplace as jest.Mock).mockResolvedValue({
        data: { booking: mockAPIResponse },
      });

      await store.dispatch(
        createBooking({
          spotId: '10',
          spotTitle: 'Downtown Parking',
          spotAddress: '123 Main St',
          spotImage: 'photo1.jpg',
          userId: '5',
          startDate: '2024-12-31T10:00:00Z',
          endDate: '2024-12-31T14:00:00Z',
          duration: 4,
          price: 100,
          paymentMethod: 'Credit Card',
        })
      );

      // Then cancel it
      (marketplaceAPI.cancelBooking as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await store.dispatch(cancelBooking('1'));

      const state = store.getState().booking;
      expect(state.loading).toBe(false);
      expect(state.bookings[0].status).toBe('cancelled');
    });

    it('should handle cancellation failure', async () => {
      const errorMessage = 'Cancellation failed';
      (marketplaceAPI.cancelBooking as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await store.dispatch(cancelBooking('1'));

      const state = store.getState().booking;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('setActiveBooking', () => {
    it('should set active booking', () => {
      const mockBooking = {
        id: '1',
        spotId: '10',
        spotTitle: 'Downtown Parking',
        spotAddress: '123 Main St',
        spotImage: 'photo1.jpg',
        userId: '5',
        startDate: '2024-12-31T10:00:00Z',
        endDate: '2024-12-31T14:00:00Z',
        duration: 4,
        price: 100,
        paymentMethod: 'Credit Card',
        status: 'active' as const,
        qrCode: 'QR123',
        createdAt: '2024-12-30T10:00:00Z',
      };

      store.dispatch(setActiveBooking(mockBooking));

      const state = store.getState().booking;
      expect(state.activeBooking).toEqual(mockBooking);
    });

    it('should clear active booking', () => {
      store.dispatch(setActiveBooking(null));

      const state = store.getState().booking;
      expect(state.activeBooking).toBe(null);
    });
  });

  describe('bookingSlice - Extension Features', () => {
    it('should handle booking with extension data', async () => {
      const mockAPIBooking = {
        id: 1,
        slotId: 10,
        userId: 5,
        startTime: '2026-04-08T10:00:00Z',
        endTime: '2026-04-08T15:00:00Z',
        originalEndTime: '2026-04-08T13:00:00Z',
        extensionCount: 2,
        totalExtensionHrs: 2,
        lastExtendedAt: '2026-04-08T11:30:00Z',
        rentalMode: 'fixed',
        status: 'active',
        price: 180,
        platformFee: 9,
        hostEarnings: 171,
        createdAt: '2026-04-08T09:00:00Z',
        slot: {
          description: 'Extended Parking',
          address: '789 Extended St',
          photos: JSON.stringify(['photo_ext.jpg']),
          qrCode: 'QR789',
        },
      };

      (marketplaceAPI.getMyBookings as jest.Mock).mockResolvedValue({
        data: { bookings: [mockAPIBooking] },
      });

      await store.dispatch(fetchBookings('5'));

      const state = store.getState().booking;
      expect(state.bookings).toHaveLength(1);
      expect(state.bookings[0].id).toBe('1');
      expect(state.bookings[0].status).toBe('active');
      expect(state.bookings[0].price).toBe(180);
    });

    it('should handle open rental mode bookings', async () => {
      const mockOpenModeBooking = {
        id: 2,
        slotId: 11,
        userId: 5,
        startTime: '2026-04-08T10:00:00Z',
        endTime: null,
        rentalMode: 'open',
        maxDuration: 12,
        authAmount: 600,
        status: 'confirmed',
        price: 600,
        platformFee: 30,
        hostEarnings: 570,
        createdAt: '2026-04-08T09:00:00Z',
        slot: {
          description: 'Open Mode Parking',
          address: '456 Open St',
          photos: JSON.stringify(['photo_open.jpg']),
          qrCode: 'QR456',
        },
      };

      (marketplaceAPI.getMyBookings as jest.Mock).mockResolvedValue({
        data: { bookings: [mockOpenModeBooking] },
      });

      await store.dispatch(fetchBookings('5'));

      const state = store.getState().booking;
      expect(state.bookings).toHaveLength(1);
      expect(state.bookings[0].id).toBe('2');
      expect(state.bookings[0].endDate).toBeNull();
      expect(state.bookings[0].price).toBe(600);
    });
  });
});
