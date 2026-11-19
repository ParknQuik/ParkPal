import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { PointsState } from '../../types';
import { pointsAPI } from '../../services/api';
import { checkAuth, login, logout, sessionInvalidated, setUser, signup } from './authSlice';

const message = (error: any) => error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed';

export const fetchBalance = createAsyncThunk('points/fetchBalance', async (_, { rejectWithValue }) => {
  try { return (await pointsAPI.getBalance()).data; }
  catch (error) { return rejectWithValue(message(error)); }
});

export const fetchHistory = createAsyncThunk('points/fetchHistory', async (data: { page: number; limit: number }, { rejectWithValue }) => {
  try { return (await pointsAPI.getHistory(data.page, data.limit)).data; }
  catch (error) { return rejectWithValue(message(error)); }
});

// The backend returns an existing code or creates one with the same request.
export const generateReferralCode = createAsyncThunk('points/generateReferralCode', async (_, { rejectWithValue }) => {
  try { return (await pointsAPI.generateReferralCode()).data; }
  catch (error) { return rejectWithValue(message(error)); }
});

export const fetchReferralStats = createAsyncThunk('points/fetchReferralStats', async (_, { rejectWithValue }) => {
  try { return (await pointsAPI.getReferralStats()).data; }
  catch (error) { return rejectWithValue(message(error)); }
});

const initialState: PointsState = {
  balance: null,
  transactions: [],
  pagination: null,
  referralStats: null,
  referralCode: null,
  balanceLoading: false,
  balanceError: null,
  historyLoading: false,
  historyError: null,
  historyRequestedPage: 1,
  referralStatsLoading: false,
  referralStatsError: null,
  codeLoading: false,
  codeError: null,
  requestIds: { balance: null, history: null, stats: null, code: null },
};

const pointsSlice = createSlice({
  name: 'points',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionInvalidated, () => initialState)
      .addCase(checkAuth.rejected, () => initialState)
      .addCase(setUser, () => initialState)
      .addCase(login.fulfilled, () => initialState)
      .addCase(signup.fulfilled, () => initialState)
      .addCase(fetchBalance.pending, (state, action) => {
        state.balanceLoading = true; state.balanceError = null; state.requestIds.balance = action.meta.requestId;
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        if (state.requestIds.balance !== action.meta.requestId) return;
        state.balanceLoading = false;
        state.balance = action.payload;
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        if (state.requestIds.balance !== action.meta.requestId) return;
        state.balanceLoading = false;
        state.balanceError = action.payload as string;
      })
      .addCase(fetchHistory.pending, (state, action) => {
        state.historyLoading = true;
        state.historyError = null;
        state.historyRequestedPage = action.meta.arg.page;
        state.requestIds.history = action.meta.requestId;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        if (state.requestIds.history !== action.meta.requestId) return;
        state.historyLoading = false;
        state.pagination = action.payload.pagination;
        state.transactions = action.meta.arg.page === 1
          ? action.payload.transactions
          : [...state.transactions, ...action.payload.transactions];
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        if (state.requestIds.history !== action.meta.requestId) return;
        state.historyLoading = false;
        state.historyError = action.payload as string;
      })
      .addCase(fetchReferralStats.pending, (state, action) => {
        state.referralStatsLoading = true; state.referralStatsError = null; state.requestIds.stats = action.meta.requestId;
      })
      .addCase(fetchReferralStats.fulfilled, (state, action) => {
        if (state.requestIds.stats !== action.meta.requestId) return;
        state.referralStatsLoading = false;
        state.referralStats = action.payload;
      })
      .addCase(fetchReferralStats.rejected, (state, action) => {
        if (state.requestIds.stats !== action.meta.requestId) return;
        state.referralStatsLoading = false;
        state.referralStatsError = action.payload as string;
      })
      .addCase(generateReferralCode.pending, (state, action) => {
        state.codeLoading = true; state.codeError = null; state.requestIds.code = action.meta.requestId;
      })
      .addCase(generateReferralCode.fulfilled, (state, action) => {
        if (state.requestIds.code !== action.meta.requestId) return;
        state.codeLoading = false;
        state.referralCode = action.payload.referralCode;
      })
      .addCase(generateReferralCode.rejected, (state, action) => {
        if (state.requestIds.code !== action.meta.requestId) return;
        state.codeLoading = false;
        state.codeError = action.payload as string;
      });
  },
});

export default pointsSlice.reducer;
