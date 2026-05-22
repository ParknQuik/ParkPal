import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BookingState, Booking } from '../../types';
import { marketplaceAPI } from '../../services/api';

const initialState: BookingState = {
  bookings: [],
  activeBooking: null,
  loading: false,
  error: null,
};

export const fetchBookings = createAsyncThunk(
  'booking/fetchBookings',
  async (userId: string) => {
    ;
    const response = await marketplaceAPI.getMyBookings();
    ;
    const apiBookings = response.data.bookings || response.data;

    // Transform API bookings to match Booking type
    const bookings = apiBookings.map((booking: any) => {
      const slot = booking.slot || {};
      let photos: string[] = [];
      try { photos = slot.photos ? JSON.parse(slot.photos) : []; } catch { photos = []; }

      return {
        id: booking.id.toString(),
        spotId: booking.slotId.toString(),
        spotTitle: slot.description || slot.address || 'Parking Spot',
        spotAddress: slot.address || '',
        spotImage: photos.length > 0 ? photos[0] : '',
        userId: booking.userId.toString(),
        startDate: booking.startTime,
        endDate: booking.endTime,
        duration: 0, // Calculate if needed
        price: booking.price,
        paymentMethod: 'Card', // Default, actual payment method not in API
        status: booking.status === 'confirmed' ? 'upcoming' : booking.status,
        qrCode: slot.qrCode || `QR-${booking.id}`,
        createdAt: booking.createdAt,
      };
    });

    ;
    return bookings;
  }
);

export const createBooking = createAsyncThunk(
  'booking/createBooking',
  async (bookingData: {
    spotId: string;
    spotTitle: string;
    spotAddress: string;
    spotImage: string;
    userId: string;
    startDate: string;
    endDate: string;
    duration: number;
    price: number;
    paymentMethod: string;
  }) => {
    ;

    const response = await marketplaceAPI.createBookingMarketplace({
      slotId: parseInt(bookingData.spotId),
      startTime: bookingData.startDate,
      endTime: bookingData.endDate,
    });

    ;
    const booking = response.data.booking || response.data;

    // Transform API response to match Booking type
    const transformed = {
      id: booking.id.toString(),
      spotId: booking.slotId.toString(),
      spotTitle: bookingData.spotTitle,
      spotAddress: bookingData.spotAddress,
      spotImage: bookingData.spotImage,
      userId: bookingData.userId,
      startDate: booking.startTime,
      endDate: booking.endTime,
      duration: bookingData.duration,
      price: booking.totalPrice || bookingData.price,
      paymentMethod: bookingData.paymentMethod,
      status: booking.status,
      qrCode: booking.qrCode || `QR-${booking.id}`,
      createdAt: booking.createdAt,
    } as Booking;

    ;
    return transformed;
  }
);

export const cancelBooking = createAsyncThunk(
  'booking/cancelBooking',
  async (bookingId: string) => {
    ;
    const response = await marketplaceAPI.cancelBooking(parseInt(bookingId));
    ;
    return bookingId;
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setActiveBooking: (state, action: PayloadAction<Booking | null>) => {
      state.activeBooking = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch bookings
    builder.addCase(fetchBookings.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchBookings.fulfilled, (state, action) => {
      state.loading = false;
      state.bookings = action.payload;
      const active = action.payload.find((b: Booking) => b.status === 'active');
      state.activeBooking = active || null;
    });
    builder.addCase(fetchBookings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch bookings';
    });

    // Create booking
    builder.addCase(createBooking.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createBooking.fulfilled, (state, action) => {
      state.loading = false;
      state.bookings.unshift(action.payload);
    });
    builder.addCase(createBooking.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create booking';
    });

    // Cancel booking
    builder.addCase(cancelBooking.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cancelBooking.fulfilled, (state, action) => {
      state.loading = false;
      const booking = state.bookings.find(b => b.id === action.payload);
      if (booking) {
        booking.status = 'cancelled';
      }
    });
    builder.addCase(cancelBooking.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to cancel booking';
    });
  },
});

export const { setActiveBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
