import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsAPI } from '../../services/api';
import { AnalyticsState, ZoneAvailability, ParkingSession, ActivityType } from '../../types';

const ANALYTICS_OPT_IN_KEY = 'analytics_opted_in';

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const loadAnalyticsOptIn = createAsyncThunk(
  'analytics/loadOptIn',
  async () => {
    const val = await AsyncStorage.getItem(ANALYTICS_OPT_IN_KEY);
    return val === 'true';
  }
);

export const setAnalyticsOptIn = createAsyncThunk(
  'analytics/setOptIn',
  async (optedIn: boolean) => {
    await AsyncStorage.setItem(ANALYTICS_OPT_IN_KEY, String(optedIn));
    return optedIn;
  }
);

export const enterZone = createAsyncThunk(
  'analytics/enterZone',
  async (payload: {
    userId: number;
    zoneId: number;
    latitude: number;
    longitude: number;
  }) => {
    const res = await analyticsAPI.zoneEnter(payload);
    return res.data as { sessionId: number; circlingStartTime: string; zoneId: number };
  }
);

export const exitZone = createAsyncThunk(
  'analytics/exitZone',
  async (payload: { sessionId: number; parked?: boolean }) => {
    const res = await analyticsAPI.zoneExit({
      ...payload,
      exitTime: new Date().toISOString(),
    });
    return res.data;
  }
);

export const logActivity = createAsyncThunk(
  'analytics/logActivity',
  async (payload: {
    userId: number;
    sessionId: number;
    activityType: ActivityType;
    confidence: number;
    latitude?: number;
    longitude?: number;
  }) => {
    const res = await analyticsAPI.logActivity(payload);
    return res.data;
  }
);

export const fetchZoneAvailability = createAsyncThunk(
  'analytics/fetchZoneAvailability',
  async (zoneId: number) => {
    const res = await analyticsAPI.getZoneAvailability(zoneId);
    return res.data as ZoneAvailability;
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const initialState: AnalyticsState = {
  activeSession: null,
  activeZoneId: null,
  zoneAvailability: {},
  optedIn: false,
  loading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearActiveSession(state) {
      state.activeSession = null;
      state.activeZoneId = null;
    },
  },
  extraReducers: (builder) => {
    // loadOptIn
    builder.addCase(loadAnalyticsOptIn.fulfilled, (state, action) => {
      state.optedIn = action.payload;
    });

    // setOptIn
    builder.addCase(setAnalyticsOptIn.fulfilled, (state, action) => {
      state.optedIn = action.payload;
    });

    // enterZone
    builder.addCase(enterZone.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(enterZone.fulfilled, (state, action) => {
      state.loading = false;
      state.activeZoneId = action.payload.zoneId;
      state.activeSession = {
        id: action.payload.sessionId,
        userId: action.meta.arg.userId,
        zoneId: action.payload.zoneId,
        circlingStartTime: action.payload.circlingStartTime,
      };
    });
    builder.addCase(enterZone.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? 'Failed to enter zone';
    });

    // exitZone
    builder.addCase(exitZone.fulfilled, (state) => {
      state.activeSession = null;
      state.activeZoneId = null;
    });

    // fetchZoneAvailability
    builder.addCase(fetchZoneAvailability.fulfilled, (state, action) => {
      state.zoneAvailability[action.payload.zoneId] = action.payload;
    });
  },
});

export const { clearError, clearActiveSession } = analyticsSlice.actions;
export default analyticsSlice.reducer;
