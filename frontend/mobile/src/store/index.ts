import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import parkingReducer from './slices/parkingSlice';
import bookingReducer from './slices/bookingSlice';
import locationReducer from './slices/locationSlice';
import { RootState } from '../types';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    parking: parkingReducer,
    booking: bookingReducer,
    location: locationReducer,
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
