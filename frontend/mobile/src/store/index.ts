import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import bookingReducer from './slices/bookingSlice';
import locationReducer from './slices/locationSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import vehiclesReducer from './slices/vehiclesSlice';
import analyticsReducer from './slices/analyticsSlice';
import pointsReducer from './slices/pointsSlice';
import { RootState } from '../types';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    booking: bookingReducer,
    location: locationReducer,
    marketplace: marketplaceReducer,
    vehicles: vehiclesReducer,
    analytics: analyticsReducer,
    points: pointsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
