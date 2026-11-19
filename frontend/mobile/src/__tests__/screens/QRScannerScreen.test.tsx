import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { QRScannerScreen } from '../../screens/QRScannerScreen';
import { marketplaceAPI } from '../../services/api';

jest.mock('expo-camera', () => ({
  Camera: { requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }) },
  CameraView: ({ onBarcodeScanned }: any) => {
    const { Text } = require('react-native');
    return <Text testID="camera" onPress={() => onBarcodeScanned?.({ data: 'PARKNQ:1:123:sig' })}>Scan</Text>;
  },
}));
jest.mock('expo-location', () => ({
  Accuracy: { High: 6 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: { mode: 'checkin', bookingId: 42 } }),
}));
jest.mock('../../services/api', () => ({ marketplaceAPI: { qrCheckIn: jest.fn() } }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: new Proxy({}, { get: () => '#fff' }) }) }));
jest.mock('../../hooks/useStatusBarStyle', () => ({ useStatusBarStyle: () => 'light' }));
jest.mock('../../components/AppHeader', () => ({ AppHeader: () => null }));

const permission = Location.requestForegroundPermissionsAsync as jest.Mock;
const position = Location.getCurrentPositionAsync as jest.Mock;
const checkIn = marketplaceAPI.qrCheckIn as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  permission.mockResolvedValue({ status: 'granted' });
  position.mockResolvedValue({ coords: { latitude: 14.5, longitude: 121.1 } });
  checkIn.mockResolvedValue({ data: { session: { id: 7 } } });
});

const scan = async () => {
  const screen = await render(<QRScannerScreen />);
  await waitFor(() => screen.getByTestId('camera'));
  fireEvent.press(screen.getByTestId('camera'));
  return screen;
};

it('sends fresh coordinates with QR and booking ID', async () => {
  const screen = await scan();
  await waitFor(() => expect(checkIn).toHaveBeenCalledWith({
    qrData: 'PARKNQ:1:123:sig', bookingId: 42, userLat: 14.5, userLon: 121.1,
  }));
  expect(screen.getByText('Check-in Successful!')).toBeTruthy();
});

it('explains denied location permission without submitting', async () => {
  permission.mockResolvedValue({ status: 'denied' });
  const screen = await scan();
  await waitFor(() => expect(screen.getByText('Location Permission Needed')).toBeTruthy());
  expect(position).not.toHaveBeenCalled();
  expect(checkIn).not.toHaveBeenCalled();
});

it('explains unavailable location without submitting', async () => {
  position.mockRejectedValue(new Error('unavailable'));
  const screen = await scan();
  await waitFor(() => expect(screen.getByText('Location Unavailable')).toBeTruthy());
  expect(checkIn).not.toHaveBeenCalled();
});

it('shows API validation details', async () => {
  checkIn.mockRejectedValue({ response: { data: { error: 'Validation failed', details: [{ message: 'User latitude is required' }] } } });
  const screen = await scan();
  await waitFor(() => expect(screen.getByText('User latitude is required')).toBeTruthy());
});
