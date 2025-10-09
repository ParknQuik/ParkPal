import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LocationState } from '../../types';
import * as Location from 'expo-location';

const initialState: LocationState = {
  currentLocation: null,
  loading: false,
  error: null,
};

export const requestLocationPermission = createAsyncThunk(
  'location/requestPermission',
  async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }
    return status;
  }
);

export const getCurrentLocation = createAsyncThunk(
  'location/getCurrentLocation',
  async () => {
    // Request permission first
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }
);

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (
      state,
      action: PayloadAction<{ latitude: number; longitude: number }>
    ) => {
      state.currentLocation = action.payload;
    },
    clearLocationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Request permission
    builder.addCase(requestLocationPermission.rejected, (state, action) => {
      state.error = action.error.message || 'Permission denied';
    });

    // Get current location
    builder.addCase(getCurrentLocation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getCurrentLocation.fulfilled, (state, action) => {
      state.loading = false;
      state.currentLocation = action.payload;
    });
    builder.addCase(getCurrentLocation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to get location';
    });
  },
});

export const { setLocation, clearLocationError } = locationSlice.actions;
export default locationSlice.reducer;
