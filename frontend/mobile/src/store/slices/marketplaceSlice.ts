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
    // Map frontend field names to backend API expected params
    const { latitude, longitude, ...rest } = params || {};
    const apiParams: Record<string, any> = { ...rest };
    if (latitude !== undefined) apiParams.lat = latitude;
    if (longitude !== undefined) apiParams.lon = longitude;
    console.log('🔄 API Request params:', apiParams);
    const response = await marketplaceAPI.searchListings(apiParams);
    console.log('✅ API Response:', {
      status: response.status,
      dataLength: response.data?.data?.length || response.data?.length || 0
    });

    // Handle v1 API response format: { data: [...], pagination: {...} }
    const listings = response.data?.data || response.data || [];
    console.log('🔍 Search query:', apiParams.q);
    console.log('📦 Raw listings count:', listings.length);

    // Transform API response to match mobile app interface
    const transformed = listings.map((listing: any) => ({
      id: listing.id,
      title: listing.address, // Use address as title
      description: listing.description || '',
      address: listing.address,
      latitude: listing.lat,
      longitude: listing.lon,
      lat: listing.lat,
      lon: listing.lon,
      price: listing.price,
      pricePerHour: listing.price,
      photos: listing.photos || [],
      amenities: listing.amenities || [],
      hostId: listing.ownerId || listing.owner?.id,
      hostName: listing.owner?.name || 'Unknown Host',
      hostAvatar: listing.owner?.profileImageUrl,
      owner: listing.owner,
      rating: listing.rating || 0,
      reviewCount: 0, // API doesn't return this, would need separate query
      reviews: listing.reviews || [],
      distance: listing.distance,
      availability: listing.status === 'available',
      status: listing.status,
      slotType: listing.slotType,
    }));

    console.log('🎯 Transformed listings count:', transformed.length);
    console.log('📦 Listings after transform:', transformed.length);
    console.log('✅ Returning transformed listings:', transformed.length);
    if (transformed.length > 0) {
      console.log('📍 First result:', transformed[0].address);
    }
    if (transformed.length > 0) {
      console.log('🎯 First transformed:', {
        id: transformed[0].id,
        address: transformed[0].address,
        lat: transformed[0].latitude,
        lon: transformed[0].longitude,
        price: transformed[0].pricePerHour,
      });
    }

    return transformed;
  }
);

export const getListingById = createAsyncThunk(
  'marketplace/getListingById',
  async (listingId: number, { getState }) => {
    // Check if listing already exists in state from search results
    const state = getState() as any;
    const existingListing = state.marketplace.listings.find((l: any) => l.id === listingId);
    if (existingListing) {
      return existingListing;
    }

    // Fetch from API - backend now has /marketplace/listings/:id endpoint
    const response = await marketplaceAPI.getListingById(listingId);
    const listing = response.data;

    // Transform to match mobile interface
    return {
      id: listing.id,
      title: listing.address,
      description: listing.description || '',
      address: listing.address,
      latitude: listing.lat,
      longitude: listing.lon,
      lat: listing.lat,
      lon: listing.lon,
      price: listing.price,
      pricePerHour: listing.price,
      photos: listing.photos || [],
      amenities: listing.amenities || [],
      hostId: listing.ownerId || listing.owner?.id,
      hostName: listing.owner?.name || 'Unknown Host',
      hostAvatar: listing.owner?.profileImageUrl,
      owner: listing.owner,
      rating: listing.rating || 0,
      reviewCount: listing.reviews?.length || 0,
      reviews: listing.reviews || [],
      distance: listing.distance,
      availability: listing.status === 'available',
      status: listing.status,
    };
  }
);

export const createListing = createAsyncThunk(
  'marketplace/createListing',
  async (params: {
    title: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    pricePerHour: number;
    photos?: string[];
    amenities?: string[];
    slotType?: string;
  }) => {
    const apiParams = {
      title: params.title,
      description: params.description,
      address: params.address,
      lat: params.latitude,
      lon: params.longitude,
      price: params.pricePerHour,
      slotType: params.slotType as 'roadside_qr' | 'commercial_manual' | 'commercial_iot',
      amenities: params.amenities,
      photos: params.photos,
    };
    const response = await marketplaceAPI.createListing(apiParams);
    return response.data;
  }
);

export const updateListing = createAsyncThunk(
  'marketplace/updateListing',
  async (params: {
    listingId: number;
    title: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    pricePerHour: number;
    photos?: string[];
    amenities?: string[];
    slotType: string;
  }) => {
    const apiParams = {
      title: params.title,
      description: params.description,
      address: params.address,
      lat: params.latitude,
      lon: params.longitude,
      price: params.pricePerHour,
      slotType: params.slotType as 'roadside_qr' | 'commercial_manual' | 'commercial_iot',
      amenities: params.amenities,
      photos: params.photos,
    };
    const response = await marketplaceAPI.updateListing(params.listingId, apiParams);
    return response.data;
  }
);

export const createBooking = createAsyncThunk(
  'marketplace/createBooking',
  async (data: {
    slotId: number;
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
    slotId: number;
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
    const listings = response.data?.data || response.data || [];

    return listings.map((listing: any) => ({
      id: listing.id,
      title: listing.address,
      description: listing.description || '',
      address: listing.address,
      latitude: listing.lat,
      longitude: listing.lon,
      lat: listing.lat,
      lon: listing.lon,
      price: listing.price,
      pricePerHour: listing.price,
      photos: listing.photos || [],
      amenities: listing.amenities || [],
      slotType: listing.slotType,
      hostId: listing.ownerId || listing.owner?.id,
      hostName: listing.owner?.name || 'Unknown Host',
      hostAvatar: listing.owner?.profileImageUrl,
      owner: listing.owner,
      rating: listing.rating || 0,
      reviewCount: listing.reviews?.length || 0,
      reviews: listing.reviews || [],
      distance: listing.distance,
      availability: listing.status === 'available',
      status: listing.status,
    }));
  }
);

export const cancelBooking = createAsyncThunk(
  'marketplace/cancelBooking',
  async (bookingId: number) => {
    await marketplaceAPI.cancelBooking(bookingId);
    return bookingId;
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

    // Update listing
    builder.addCase(updateListing.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateListing.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.myListings.findIndex((l) => l.id === action.payload.id);
      if (index !== -1) {
        state.myListings[index] = action.payload;
      }
    });
    builder.addCase(updateListing.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update listing';
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

    // Cancel booking
    builder.addCase(cancelBooking.fulfilled, (state, action) => {
      state.bookings = state.bookings.filter((b) => b.id !== action.payload);
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
