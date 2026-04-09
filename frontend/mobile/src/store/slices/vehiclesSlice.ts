import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { vehiclesAPI } from '../../services/api';

export interface Vehicle {
  id: number;
  userId: number;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  imageUrl: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export const getVehicles = createAsyncThunk(
  'vehicles/getVehicles',
  async () => {
    const response = await vehiclesAPI.getVehicles();
    return response.data as Vehicle[];
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
      if (error.response) {
        const errorMessage = error.response.data?.error || 
                           error.response.data?.message || 
                           `HTTP ${error.response.status}: ${error.response.statusText}`;
        return rejectWithValue({ message: errorMessage, status: error.response.status, data: error.response.data });
      } else if (error.request) {
        return rejectWithValue({ message: 'No response from server', status: null });
      } else {
        return rejectWithValue({ message: error.message, status: null });
      }
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ id, data }: { id: number; data: Partial<Vehicle> }, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.updateVehicle(id, data);
      return response.data as Vehicle;
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.error || 
                           error.response.data?.message || 
                           `HTTP ${error.response.status}: ${error.response.statusText}`;
        return rejectWithValue({ message: errorMessage, status: error.response.status });
      }
      return rejectWithValue({ message: error.message, status: null });
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (id: number) => {
    await vehiclesAPI.deleteVehicle(id);
    return id;
  }
);

export const setDefaultVehicle = createAsyncThunk(
  'vehicles/setDefaultVehicle',
  async (id: number) => {
    const response = await vehiclesAPI.setDefaultVehicle(id);
    return response.data as Vehicle;
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
        state.error = action.error.message || 'Failed to fetch vehicles';
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
        const errorPayload = action.payload as any;
        state.error = errorPayload?.message || action.error.message || 'Failed to create vehicle';
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
        state.error = action.error.message || 'Failed to update vehicle';
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
        state.error = action.error.message || 'Failed to delete vehicle';
      })
      // Set default vehicle
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
