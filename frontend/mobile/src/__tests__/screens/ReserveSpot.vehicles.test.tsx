import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReserveSpot } from '../../screens/ReserveSpot';
import vehiclesReducer from '../../store/slices/vehiclesSlice';
import { behaviorAPI, marketplaceAPI, vehiclesAPI } from '../../services/api';

let mockFocusCallback: (() => void) | undefined;
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
  useRoute: () => ({ params: { spotId: '42' } }),
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    mockFocusCallback = callback;
    React.useEffect(() => { callback(); }, [callback]);
  },
}));
jest.mock('../../services/api', () => ({
  behaviorAPI: { getStatus: jest.fn() },
  marketplaceAPI: { getListingById: jest.fn() },
  vehiclesAPI: { getVehicles: jest.fn() },
}));
jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: {
  appHeaderBackground: '#000', background: '#fff', surface: '#fff', surfaceSecondary: '#eee',
  border: '#ddd', textPrimary: '#111', textSecondary: '#555', textTertiary: '#777',
  primary: '#080', white: '#fff', black: '#000', warning: '#b80', success: '#080',
} }) }));
jest.mock('../../hooks/useStatusBarStyle', () => ({ useStatusBarStyle: () => 'dark' }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../components/AccountStanding', () => ({ AccountStanding: () => null }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'Icon');

const vehicle = (id: number) => ({
  id, userId: 1, make: 'Toyota', model: `Car ${id}`, year: 2024,
  color: 'Blue', licensePlate: `ABC-${id}`, isDefault: false,
  createdAt: '', updatedAt: '',
});

const renderScreen = async () => {
  const store = configureStore({ reducer: { vehicles: vehiclesReducer } });
  const screen = await render(<Provider store={store}><ReserveSpot /></Provider>);
  await waitFor(() => expect(screen.getByText('Select Vehicle')).toBeTruthy());
  return { ...screen, store };
};

const selected = (screen: Awaited<ReturnType<typeof render>>, id: number) =>
  screen.getByLabelText(`Toyota Car ${id}, ABC-${id}`).props.accessibilityState.selected;

describe('ReserveSpot vehicles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusCallback = undefined;
    (marketplaceAPI.getListingById as jest.Mock).mockResolvedValue({ data: { id: 42, title: 'Sample Spot', price: 100 } });
    (behaviorAPI.getStatus as jest.Mock).mockResolvedValue({ data: null });
    (vehiclesAPI.getVehicles as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('shows a newly created vehicle on return without reopening the listing', async () => {
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByText('No vehicles found. Add a vehicle to continue.')).toBeTruthy());
    await fireEvent.press(screen.getByText('Add New Vehicle'));
    expect(mockNavigate).toHaveBeenCalledWith('MyVehicles');

    await act(async () => {
      screen.store.dispatch({ type: 'vehicles/createVehicle/fulfilled', payload: vehicle(7) });
      (vehiclesAPI.getVehicles as jest.Mock).mockResolvedValue({ data: [vehicle(7)] });
      mockFocusCallback?.();
    });

    await waitFor(() => expect(selected(screen, 7)).toBe(true));
    expect(marketplaceAPI.getListingById).toHaveBeenCalledTimes(1);
  });

  it('keeps a valid selection and replaces one removed by a refresh', async () => {
    (vehiclesAPI.getVehicles as jest.Mock).mockResolvedValue({ data: [vehicle(1), vehicle(2)] });
    const screen = await renderScreen();
    await waitFor(() => expect(selected(screen, 1)).toBe(true));
    await fireEvent.press(screen.getByLabelText('Toyota Car 2, ABC-2'));
    expect(selected(screen, 2)).toBe(true);

    await act(async () => { mockFocusCallback?.(); });
    expect(selected(screen, 2)).toBe(true);

    (vehiclesAPI.getVehicles as jest.Mock).mockResolvedValue({ data: [vehicle(1)] });
    await act(async () => { mockFocusCallback?.(); });
    await waitFor(() => expect(selected(screen, 1)).toBe(true));
    expect(screen.queryByLabelText('Toyota Car 2, ABC-2')).toBeNull();
  });

  it('offers retry after a failed first fetch while keeping the listing visible', async () => {
    (vehiclesAPI.getVehicles as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByLabelText('Retry loading vehicles')).toBeTruthy());
    expect(screen.queryByText('No vehicles found. Add a vehicle to continue.')).toBeNull();
    expect(screen.getByText('Sample Spot')).toBeTruthy();

    (vehiclesAPI.getVehicles as jest.Mock).mockResolvedValue({ data: [vehicle(3)] });
    await fireEvent.press(screen.getByLabelText('Retry loading vehicles'));
    await waitFor(() => expect(selected(screen, 3)).toBe(true));
  });
});
