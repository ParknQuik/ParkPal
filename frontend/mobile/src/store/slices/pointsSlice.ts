import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PointsState, PointsBalance, PointsHistoryResponse, ReferralStats, PointsTransaction } from '../../types';
import { pointsAPI } from '../../services/api';

// Define async thunks
export const fetchBalance = createAsyncThunk(
  'points/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await pointsAPI.getBalance();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const earnPoints = createAsyncThunk(
  'points/earnPoints',
  async (data: { bookingId: string; amount: number }, { rejectWithValue }) => {
    try {
      const response = await pointsAPI.earnPoints(data.bookingId, data.amount);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const redeemPoints = createAsyncThunk(
  'points/redeemPoints',
  async (data: { amount: number; bookingId?: string }, { rejectWithValue }) => {
    try {
      const response = await pointsAPI.redeemPoints(data.amount, data.bookingId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchHistory = createAsyncThunk(
  'points/fetchHistory',
  async (data: { page: number; limit: number }, { rejectWithValue }) => {
    try {
      const response = await pointsAPI.getHistory(data.page, data.limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const generateReferralCode = createAsyncThunk(
  'points/generateReferralCode',
  async (_, { rejectWithValue }) => {
    try {
      const response = await pointsAPI.generateReferralCode();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchReferralStats = createAsyncThunk(
  'points/fetchReferralStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await pointsAPI.getReferralStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Define initial state
const initialState: PointsState = {
  balance: null,
  transactions: [],
  referralStats: null,
  referralCode: null,
  loading: false,
  error: null,
};

// Create slice
const pointsSlice = createSlice({
  name: 'points',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearReferralCode: (state) => {
      state.referralCode = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Balance
      .addCase(fetchBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBalance.fulfilled, (state, action: PayloadAction<PointsBalance>) => {
        state.loading = false;
        state.balance = action.payload;
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Earn Points
      .addCase(earnPoints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(earnPoints.fulfilled, (state, action: PayloadAction<PointsTransaction>) => {
        state.loading = false;
        if (state.balance) {
          state.balance.balance += action.payload.amount;
        }
        state.transactions.unshift(action.payload);
      })
      .addCase(earnPoints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Redeem Points
      .addCase(redeemPoints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(redeemPoints.fulfilled, (state, action: PayloadAction<PointsTransaction>) => {
        state.loading = false;
        if (state.balance) {
          state.balance.balance -= action.payload.amount;
        }
        state.transactions.unshift(action.payload);
      })
      .addCase(redeemPoints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch History
      .addCase(fetchHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action: PayloadAction<PointsHistoryResponse>) => {
        state.loading = false;
        state.transactions = action.payload.transactions;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Generate Referral Code
      .addCase(generateReferralCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReferralCode.fulfilled, (state, action: PayloadAction<{ code: string }>) => {
        state.loading = false;
        state.referralCode = action.payload.code;
      })
      .addCase(generateReferralCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Referral Stats
      .addCase(fetchReferralStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferralStats.fulfilled, (state, action: PayloadAction<ReferralStats>) => {
        state.loading = false;
        state.referralStats = action.payload;
      })
      .addCase(fetchReferralStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearReferralCode } = pointsSlice.actions;
export default pointsSlice.reducer;