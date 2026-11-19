import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfileScreen } from '../../screens/ProfileScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../store', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: (state: unknown) => unknown) => selector({
    auth: { user: { name: 'Driver', email: 'driver@example.com', totalBookings: 2 } },
    settings: { themeMode: 'system' },
  }),
}));
jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: {
  background: '#fff', surface: '#fff', primary: '#080', white: '#fff',
  textPrimary: '#111', textSecondary: '#555', textTertiary: '#777', border: '#ddd',
  accentYellow: '#fc0', accentOrange: '#f80', info: '#08f', error: '#c00',
} }) }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'Icon' }));
jest.mock('../../services/profilePhotoUpload', () => ({ uploadProfilePhoto: jest.fn() }));

it('opens the single Perks route from the profile entry and card', async () => {
  const screen = await render(<ProfileScreen />);
  const perks = screen.getAllByText('Perks');
  expect(perks).toHaveLength(2);
  expect(screen.queryByText('Points History')).toBeNull();
  expect(screen.queryByText('Referrals')).toBeNull();
  await fireEvent.press(perks[0]);
  await fireEvent.press(perks[1]);
  expect(mockNavigate).toHaveBeenNthCalledWith(1, 'Perks');
  expect(mockNavigate).toHaveBeenNthCalledWith(2, 'Perks');
});
