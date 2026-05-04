import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { combineReducers } from 'redux';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import bookingReducer from './slices/bookingSlice';
import locationReducer from './slices/locationSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import vehiclesReducer from './slices/vehiclesSlice';
import analyticsReducer from './slices/analyticsSlice';
import pointsReducer from './slices/pointsSlice';
import settingsReducer from './slices/settingsSlice';
import { RootState } from '../types';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['settings', 'auth'],
};

const rootReducer = combineReducers({
  auth: authReducer,
  booking: bookingReducer,
  location: locationReducer,
  marketplace: marketplaceReducer,
  vehicles: vehiclesReducer,
  analytics: analyticsReducer,
  points: pointsReducer,
  settings: settingsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
