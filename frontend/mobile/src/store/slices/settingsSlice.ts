import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@parknquik/themeMode';

type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  themeMode: ThemeMode;
}

const initialState: SettingsState = {
  themeMode: 'system',
};

export const loadThemeMode = createAsyncThunk('settings/loadThemeMode', async () => {
  const stored = await AsyncStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system' as ThemeMode;
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
      AsyncStorage.setItem(THEME_KEY, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadThemeMode.fulfilled, (state, action) => {
      state.themeMode = action.payload;
    });
  },
});

export const { setThemeMode } = settingsSlice.actions;
export default settingsSlice.reducer;
