import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import { AuthState, User } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';
import { notificationService } from '../../services/notifications';

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  checkingAuth: false,
  error: null,
};

const normalizeAuthError = (error: unknown, fallbackMessage: string): string => {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;

  if (responseData && typeof responseData === 'object') {
    const data = responseData as {
      error?: unknown;
      details?: Array<{ message?: unknown }>;
    };

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }

    if (Array.isArray(data.details)) {
      const detailMessages = data.details
        .map((detail) => detail.message)
        .filter((message): message is string => typeof message === 'string' && Boolean(message.trim()));

      if (detailMessages.length > 0) {
        return detailMessages.join('\n');
      }
    }
  }

  const message = (error as { message?: unknown })?.message;
  return typeof message === 'string' && message.trim() ? message : fallbackMessage;
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials.email, credentials.password);

      const { token, user } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return { user, token };
    } catch (error) {
      return rejectWithValue(normalizeAuthError(error, 'Login failed'));
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (data: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.signup(data.name, data.email, data.password);

      const { token, user } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return { user, token };
    } catch (error) {
      return rejectWithValue(normalizeAuthError(error, 'Signup failed'));
    }
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

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: { name: string; phone: string | null; profileImageUrl?: string }) => {
    const response = await authAPI.updateProfile(data);
    const updatedUser = response.data;

    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    return updatedUser;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state) => {
      state.loading = false;
      state.checkingAuth = false;
      state.error = null;
    });

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

      (async () => {
        try {
          const pushToken = await notificationService.getPushToken();
          if (pushToken) {
            ;
            await AsyncStorage.setItem('pushToken', pushToken);
          }
        } catch (error) {
          ;
        }
      })();
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string | undefined) || action.error.message || 'Login failed';
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

      (async () => {
        try {
          const pushToken = await notificationService.getPushToken();
          if (pushToken) {
            ;
            await AsyncStorage.setItem('pushToken', pushToken);
          }
        } catch (error) {
          ;
        }
      })();
    });
    builder.addCase(signup.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string | undefined) || action.error.message || 'Signup failed';
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });

    // Check Auth
    builder.addCase(checkAuth.pending, (state) => {
      state.checkingAuth = true;
      state.error = null;
    });
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.checkingAuth = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(checkAuth.rejected, (state) => {
      state.checkingAuth = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });

    // Update Profile
    builder.addCase(updateUserProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
    });
    builder.addCase(updateUserProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update profile';
    });
  },
});

export const { clearError, setUser, setToken } = authSlice.actions;
export default authSlice.reducer;
