import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { combineReducers } from 'redux';
import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import bookingReducer from './slices/bookingSlice';
import locationReducer from './slices/locationSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import vehiclesReducer from './slices/vehiclesSlice';
import analyticsReducer from './slices/analyticsSlice';
import pointsReducer from './slices/pointsSlice';
import settingsReducer from './slices/settingsSlice';
import behaviorReducer from './slices/behaviorSlice';
import { RootState } from '../types';
import { sanitizePersistedAuthState } from './persistence';

const authPersistTransform = createTransform(
  (inboundState: unknown) => sanitizePersistedAuthState(inboundState),
  (outboundState: unknown) => sanitizePersistedAuthState(outboundState),
  { whitelist: ['auth'] }
);

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['settings', 'auth'],
  transforms: [authPersistTransform],
};

const rootReducer = combineReducers({
  auth: authReducer,
  behavior: behaviorReducer,
  booking: bookingReducer,
  location: locationReducer,
  marketplace: marketplaceReducer,
  vehicles: vehiclesReducer,
  analytics: analyticsReducer,
  points: pointsReducer,
  settings: settingsReducer,
});

const persistedReducer = persistReducer<ReturnType<typeof rootReducer>>(persistConfig, rootReducer);

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
