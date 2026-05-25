import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { behaviorAPI } from '../../services/api';
import { BehaviorState } from '../../types';

const initialState: BehaviorState = {
  status: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

export const fetchBehaviorStatus = createAsyncThunk(
  'behavior/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await behaviorAPI.getStatus();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to load account standing');
    }
  }
);

const behaviorSlice = createSlice({
  name: 'behavior',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchBehaviorStatus.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchBehaviorStatus.fulfilled, (state, action) => {
      state.loading = false;
      state.status = action.payload;
      state.lastFetchedAt = new Date().toISOString();
    });
    builder.addCase(fetchBehaviorStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export default behaviorSlice.reducer;
