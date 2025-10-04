import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user: User = {
      id: '1',
      email: credentials.email,
      name: 'John Doe',
      phone: '+1234567890',
      avatar: 'https://i.pravatar.cc/150?img=1',
      totalBookings: 24,
      totalSpent: 1250,
      activeSince: '2023-01-15',
    };

    const token = 'mock-jwt-token';
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));

    return { user, token };
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (data: { email: string; password: string; name: string }) => {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user: User = {
      id: '1',
      email: data.email,
      name: data.name,
      totalBookings: 0,
      totalSpent: 0,
      activeSince: new Date().toISOString(),
    };

    const token = 'mock-jwt-token';
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));

    return { user, token };
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
});

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const token = await AsyncStorage.getItem('token');
  const userStr = await AsyncStorage.getItem('user');

  if (token && userStr) {
    const user = JSON.parse(userStr);
    return { user, token };
  }

  throw new Error('Not authenticated');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Login failed';
    });

    // Signup
    builder.addCase(signup.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signup.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(signup.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Signup failed';
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });

    // Check Auth
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(checkAuth.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
