import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ParkingState, ParkingSpot } from '../../types';
import { parkingAPI } from '../../services/api';

const initialState: ParkingState = {
  spots: [],
  selectedSpot: null,
  loading: false,
  error: null,
  filters: {
    priceRange: [0, 100],
    amenities: [],
    sortBy: 'distance',
  },
};

export const fetchParkingSpots = createAsyncThunk(
  'parking/fetchSpots',
  async (location?: { latitude: number; longitude: number }) => {
    try {
      const response = await parkingAPI.getSpots({
        latitude: location?.latitude,
        longitude: location?.longitude,
        radius: 10,
      });
      return response.data || response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch spots:', error);
      throw error;
    }
  }
);

export const fetchSpotById = createAsyncThunk(
  'parking/fetchSpotById',
  async (spotId: string) => {
    try {
      const response = await parkingAPI.getSpotById(spotId);
      return response.data || response.data.data;
    } catch (error) {
      console.error('Failed to fetch spot:', error);
      throw error;
    }
  }
);

export const searchSpots = createAsyncThunk(
  'parking/searchSpots',
  async (query: string) => {
    try {
      const response = await parkingAPI.searchSpots(query);
      return response.data || response.data.data || [];
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }
);

const parkingSlice = createSlice({
  name: 'parking',
  initialState,
  reducers: {
    setSelectedSpot: (state, action: PayloadAction<ParkingSpot | null>) => {
      state.selectedSpot = action.payload;
    },
    updateFilters: (
      state,
      action: PayloadAction<Partial<ParkingState['filters']>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    // Fetch parking spots
    builder.addCase(fetchParkingSpots.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchParkingSpots.fulfilled, (state, action) => {
      state.loading = false;
      state.spots = action.payload;
    });
    builder.addCase(fetchParkingSpots.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch parking spots';
    });

    // Fetch spot by ID
    builder.addCase(fetchSpotById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchSpotById.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedSpot = action.payload;
    });
    builder.addCase(fetchSpotById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch spot';
    });

    // Search spots
    builder.addCase(searchSpots.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(searchSpots.fulfilled, (state, action) => {
      state.loading = false;
      state.spots = action.payload;
    });
    builder.addCase(searchSpots.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Search failed';
    });
  },
});

export const { setSelectedSpot, updateFilters, clearFilters } =
  parkingSlice.actions;
export default parkingSlice.reducer;
