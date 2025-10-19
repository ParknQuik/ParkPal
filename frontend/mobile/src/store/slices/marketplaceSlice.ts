import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  MarketplaceState,
  MarketplaceListing,
  MarketplaceBooking,
  Review,
  HostEarnings,
  SearchFilters,
} from '../../types';
import { marketplaceAPI } from '../../services/api';

const initialState: MarketplaceState = {
  listings: [],
  selectedListing: null,
  myListings: [],
  bookings: [],
  activeBooking: null,
  reviews: [],
  hostEarnings: null,
  filters: {
    sortBy: 'distance',
  },
  loading: false,
  error: null,
};

// Async thunks
export const searchListings = createAsyncThunk(
  'marketplace/searchListings',
  async (params?: SearchFilters) => {
    const response = await marketplaceAPI.searchListings(params);
    return response.data;
  }
);

export const getListingById = createAsyncThunk(
  'marketplace/getListingById',
  async (listingId: number) => {
    const response = await marketplaceAPI.getListingById(listingId);
    return response.data;
  }
);

export const createListing = createAsyncThunk(
  'marketplace/createListing',
  async (data: {
    title: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    pricePerHour: number;
    photos?: string[];
    amenities?: string[];
  }) => {
    const response = await marketplaceAPI.createListing(data);
    return response.data;
  }
);

export const createBooking = createAsyncThunk(
  'marketplace/createBooking',
  async (data: {
    listingId: number;
    startTime: string;
    endTime: string;
  }) => {
    const response = await marketplaceAPI.createBookingMarketplace(data);
    return response.data;
  }
);

export const getMyBookings = createAsyncThunk(
  'marketplace/getMyBookings',
  async () => {
    const response = await marketplaceAPI.getMyBookings();
    return response.data;
  }
);

export const qrCheckIn = createAsyncThunk(
  'marketplace/qrCheckIn',
  async (data: { qrData: string; bookingId?: number }) => {
    const response = await marketplaceAPI.qrCheckIn(data);
    return response.data;
  }
);

export const qrCheckOut = createAsyncThunk(
  'marketplace/qrCheckOut',
  async (data: { sessionId: number }) => {
    const response = await marketplaceAPI.qrCheckOut(data);
    return response.data;
  }
);

export const getListingReviews = createAsyncThunk(
  'marketplace/getListingReviews',
  async (listingId: number) => {
    const response = await marketplaceAPI.getListingReviews(listingId);
    return response.data;
  }
);

export const createReview = createAsyncThunk(
  'marketplace/createReview',
  async (data: {
    listingId: number;
    bookingId: number;
    rating: number;
    comment: string;
  }) => {
    const response = await marketplaceAPI.createReview(data);
    return response.data;
  }
);

export const getHostEarnings = createAsyncThunk(
  'marketplace/getHostEarnings',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await marketplaceAPI.getHostEarnings(params);
    return response.data;
  }
);

export const getMyListings = createAsyncThunk(
  'marketplace/getMyListings',
  async () => {
    const response = await marketplaceAPI.getMyListings();
    return response.data;
  }
);

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    setSelectedListing: (state, action: PayloadAction<MarketplaceListing | null>) => {
      state.selectedListing = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<SearchFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { sortBy: 'distance' };
    },
    setActiveBooking: (state, action: PayloadAction<MarketplaceBooking | null>) => {
      state.activeBooking = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Search listings
    builder.addCase(searchListings.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(searchListings.fulfilled, (state, action) => {
      state.loading = false;
      state.listings = action.payload;
    });
    builder.addCase(searchListings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to search listings';
    });

    // Get listing by ID
    builder.addCase(getListingById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getListingById.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedListing = action.payload;
    });
    builder.addCase(getListingById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch listing';
    });

    // Create listing
    builder.addCase(createListing.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createListing.fulfilled, (state, action) => {
      state.loading = false;
      state.myListings.push(action.payload);
    });
    builder.addCase(createListing.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create listing';
    });

    // Create booking
    builder.addCase(createBooking.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createBooking.fulfilled, (state, action) => {
      state.loading = false;
      state.bookings.push(action.payload.booking);
      state.activeBooking = action.payload.booking;
    });
    builder.addCase(createBooking.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create booking';
    });

    // Get my bookings
    builder.addCase(getMyBookings.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getMyBookings.fulfilled, (state, action) => {
      state.loading = false;
      state.bookings = action.payload;
    });
    builder.addCase(getMyBookings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch bookings';
    });

    // QR check-in
    builder.addCase(qrCheckIn.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(qrCheckIn.fulfilled, (state, action) => {
      state.loading = false;
      // Update active booking with session info
      if (state.activeBooking && action.payload.session) {
        state.activeBooking.sessionId = action.payload.session.id;
        state.activeBooking.status = 'active';
      }
    });
    builder.addCase(qrCheckIn.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Check-in failed';
    });

    // QR check-out
    builder.addCase(qrCheckOut.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(qrCheckOut.fulfilled, (state, action) => {
      state.loading = false;
      // Update active booking status
      if (state.activeBooking) {
        state.activeBooking.status = 'completed';
        state.activeBooking = null;
      }
    });
    builder.addCase(qrCheckOut.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Check-out failed';
    });

    // Get listing reviews
    builder.addCase(getListingReviews.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getListingReviews.fulfilled, (state, action) => {
      state.loading = false;
      state.reviews = action.payload;
    });
    builder.addCase(getListingReviews.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch reviews';
    });

    // Create review
    builder.addCase(createReview.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createReview.fulfilled, (state, action) => {
      state.loading = false;
      state.reviews.unshift(action.payload);
    });
    builder.addCase(createReview.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create review';
    });

    // Get host earnings
    builder.addCase(getHostEarnings.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getHostEarnings.fulfilled, (state, action) => {
      state.loading = false;
      state.hostEarnings = action.payload;
    });
    builder.addCase(getHostEarnings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch earnings';
    });

    // Get my listings
    builder.addCase(getMyListings.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getMyListings.fulfilled, (state, action) => {
      state.loading = false;
      state.myListings = action.payload;
    });
    builder.addCase(getMyListings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch listings';
    });
  },
});

export const {
  setSelectedListing,
  updateFilters,
  clearFilters,
  setActiveBooking,
  clearError,
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;
