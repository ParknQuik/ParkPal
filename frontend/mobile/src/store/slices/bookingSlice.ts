import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BookingState, Booking } from '../../types';
import { mockBookings } from '../../services/mockData';

const initialState: BookingState = {
  bookings: [],
  activeBooking: null,
  loading: false,
  error: null,
};

export const fetchBookings = createAsyncThunk(
  'booking/fetchBookings',
  async (userId: string) => {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockBookings.filter(b => b.userId === userId);
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
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newBooking: Booking = {
      ...bookingData,
      id: Date.now().toString(),
      status: 'upcoming',
      qrCode: `QR-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    return newBooking;
  }
);

export const cancelBooking = createAsyncThunk(
  'booking/cancelBooking',
  async (bookingId: string) => {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
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
      const active = action.payload.find(b => b.status === 'active');
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
