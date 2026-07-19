export { Vehicle } from '../../types';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { vehiclesAPI } from '../../services/api';
import { Vehicle } from '../../types';

interface VehiclesState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
}

const initialState: VehiclesState = {
  vehicles: [],
  loading: false,
  error: null,
};

const getVehicleErrorMessage = (error: any, fallback: string): string => {
  const responseData = error?.response?.data;
  const responseCandidates = [responseData?.error, responseData?.message];

  const stringResponseError = responseCandidates.find((candidate) => typeof candidate === 'string');
  if (stringResponseError) {
    return stringResponseError;
  }

  const objectResponseError = responseCandidates.find(
    (candidate) => candidate && typeof candidate === 'object' && 'message' in candidate
  );
  if (objectResponseError) {
    return String((objectResponseError as { message?: unknown }).message);
  }

  if (error?.response) {
    return `HTTP ${error.response.status}: ${error.response.statusText || fallback}`;
  }

  if (error?.request) {
    return 'No response from server';
  }

  return typeof error?.message === 'string' ? error.message : fallback;
};

export const getVehicles = createAsyncThunk(
  'vehicles/getVehicles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.getVehicles();
      return response.data as Vehicle[];
    } catch (error: any) {
      return rejectWithValue(getVehicleErrorMessage(error, 'Failed to fetch vehicles'));
    }
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/createVehicle',
  async (data: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    imageUrl?: string;
    isDefault?: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.createVehicle(data);
      return response.data as Vehicle;
    } catch (error: any) {
      return rejectWithValue(getVehicleErrorMessage(error, 'Failed to create vehicle'));
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ id, data }: { id: number; data: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    licensePlate?: string;
    imageUrl?: string;
    isDefault?: boolean;
  } }, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.updateVehicle(id, data);
      return response.data as Vehicle;
    } catch (error: any) {
      return rejectWithValue(getVehicleErrorMessage(error, 'Failed to update vehicle'));
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (id: number, { rejectWithValue }) => {
    try {
      await vehiclesAPI.deleteVehicle(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(getVehicleErrorMessage(error, 'Failed to delete vehicle'));
    }
  }
);

export const setDefaultVehicle = createAsyncThunk(
  'vehicles/setDefaultVehicle',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.setDefaultVehicle(id);
      return response.data as Vehicle;
    } catch (error: any) {
      return rejectWithValue(getVehicleErrorMessage(error, 'Failed to set default vehicle'));
    }
  }
);

const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get vehicles
      .addCase(getVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload;
      })
      .addCase(getVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch vehicles';
      })
      // Create vehicle
      .addCase(createVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles.unshift(action.payload);
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to create vehicle';
      })
      // Update vehicle
      .addCase(updateVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.vehicles.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
      })
      .addCase(updateVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to update vehicle';
      })
      // Delete vehicle
      .addCase(deleteVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to delete vehicle';
      })
      // Set default vehicle
      .addCase(setDefaultVehicle.rejected, (state, action) => {
        state.error = (action.payload as string) || action.error.message || 'Failed to set default vehicle';
      })
      .addCase(setDefaultVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.map(v => ({
          ...v,
          isDefault: v.id === action.payload.id,
        }));
      });
  },
});

export const { clearError } = vehiclesSlice.actions;
export default vehiclesSlice.reducer;
