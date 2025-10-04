import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ParkingState, ParkingSpot } from '../../types';
import { mockParkingSpots } from '../../services/mockData';

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
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Calculate distances if location is provided
    let spots = [...mockParkingSpots];
    if (location) {
      spots = spots.map(spot => ({
        ...spot,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          spot.latitude,
          spot.longitude
        ),
      }));
    }

    return spots;
  }
);

export const fetchSpotById = createAsyncThunk(
  'parking/fetchSpotById',
  async (spotId: string) => {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 300));
    const spot = mockParkingSpots.find(s => s.id === spotId);
    if (!spot) throw new Error('Spot not found');
    return spot;
  }
);

export const searchSpots = createAsyncThunk(
  'parking/searchSpots',
  async (query: string) => {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockParkingSpots.filter(
      spot =>
        spot.title.toLowerCase().includes(query.toLowerCase()) ||
        spot.address.toLowerCase().includes(query.toLowerCase()) ||
        spot.city.toLowerCase().includes(query.toLowerCase())
    );
  }
);

// Helper function to calculate distance
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

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
