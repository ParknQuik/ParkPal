import React from 'react';
import { Alert, AlertButton } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { MyListingsScreen } from '../../screens/MyListingsScreen';
import { useAppDispatch, useAppSelector } from '../../store';

jest.mock('../../services/api', () => ({
  marketplaceAPI: {
    getMyListings: jest.fn(),
    getListingById: jest.fn(),
    toggleListingAvailability: jest.fn(),
    deleteListing: jest.fn(),
  },
}));

jest.mock('../../store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const Icon = ({ name }: { name?: string }) => <Text>{name}</Text>;

  return {
    MaterialIcons: Icon,
    MaterialCommunityIcons: Icon,
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('../../components/SkeletonLoader', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SkeletonLoader: ({ style }: { style?: object }) => <View style={style} />,
  };
});

jest.mock('../../utils/haptics', () => ({
  haptics: {
    light: jest.fn(),
  },
}));

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;

let mockDispatch: jest.Mock;

const setMarketplaceState = (marketplaceState: {
  myListings: any[];
  loading: boolean;
  error: string | null;
}) => {
  mockUseAppSelector.mockImplementation((selector) => selector({
    marketplace: marketplaceState,
  }));
};

describe('MyListingsScreen states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn((action: any): any => {
      if (typeof action === 'function') {
        return action(mockDispatch, jest.fn(), undefined);
      }

      return action;
    });
    mockUseAppDispatch.mockReturnValue(mockDispatch);
  });

  it('shows skeleton listing outlines during initial load', () => {
    setMarketplaceState({
      myListings: [],
      loading: true,
      error: null,
    });

    const { getByLabelText, getAllByTestId, queryByText } = render(<MyListingsScreen />);

    expect(getByLabelText('Loading listings')).toBeTruthy();
    expect(getAllByTestId('listing-skeleton-card')).toHaveLength(3);
    expect(queryByText('Loading listings...')).toBeNull();
  });

  it('shows a retryable failure state and retries loading listings', async () => {
    const { marketplaceAPI } = require('../../services/api');
    marketplaceAPI.getMyListings.mockResolvedValue({ data: [] });

    setMarketplaceState({
      myListings: [],
      loading: false,
      error: 'Network request failed',
    });

    const { getByText, getByLabelText } = render(<MyListingsScreen />);

    expect(getByText('Unable to load listings')).toBeTruthy();
    expect(getByText('Network request failed')).toBeTruthy();

    fireEvent.press(getByLabelText('Retry loading listings'));

    await waitFor(() => {
      expect(marketplaceAPI.getMyListings).toHaveBeenCalledTimes(1);
    });
  });

  it('activates an inactive listing with an explicit true target state', async () => {
    const { marketplaceAPI } = require('../../services/api');
    marketplaceAPI.toggleListingAvailability.mockResolvedValue({
      data: { listing: { id: 21, isActive: true, availability: true } },
    });
    marketplaceAPI.getMyListings.mockResolvedValue({ data: [] });

    setMarketplaceState({
      myListings: [
        {
          id: 21,
          title: 'Paused driveway',
          address: '123 Main Street',
          pricePerHour: 80,
          photos: [],
          availability: false,
        },
      ],
      loading: false,
      error: null,
    });

    const { getByText } = render(<MyListingsScreen />);

    fireEvent.press(getByText('Activate'));

    await waitFor(() => {
      expect(marketplaceAPI.toggleListingAvailability).toHaveBeenCalledWith(21, true);
    });
  });

  it('pauses an active listing from the options menu with an explicit false target state', async () => {
    const { marketplaceAPI } = require('../../services/api');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(((
      _title: string,
      _message?: string,
      buttons?: AlertButton[],
    ) => {
      const toggleButton = buttons?.find((button) => button.text === 'Toggle Availability');
      toggleButton?.onPress?.();
    }) as any);
    marketplaceAPI.toggleListingAvailability.mockResolvedValue({
      data: { listing: { id: 22, isActive: false, availability: false } },
    });
    marketplaceAPI.getMyListings.mockResolvedValue({ data: [] });

    setMarketplaceState({
      myListings: [
        {
          id: 22,
          title: 'Active driveway',
          address: '456 Main Street',
          pricePerHour: 90,
          photos: [],
          availability: true,
        },
      ],
      loading: false,
      error: null,
    });

    const { getByText } = render(<MyListingsScreen />);

    fireEvent.press(getByText('more-horiz'));

    await waitFor(() => {
      expect(marketplaceAPI.toggleListingAvailability).toHaveBeenCalledWith(22, false);
    });

    alertSpy.mockRestore();
  });

  it('does not send duplicate toggle requests while a listing toggle is pending', async () => {
    const { marketplaceAPI } = require('../../services/api');
    let resolveToggle: (value: unknown) => void = () => undefined;
    marketplaceAPI.toggleListingAvailability.mockReturnValue(new Promise((resolve) => {
      resolveToggle = resolve;
    }));

    setMarketplaceState({
      myListings: [
        {
          id: 23,
          title: 'Paused carport',
          address: '789 Main Street',
          pricePerHour: 70,
          photos: [],
          availability: false,
        },
      ],
      loading: false,
      error: null,
    });

    const { getByText } = render(<MyListingsScreen />);
    const activateButton = getByText('Activate');

    fireEvent.press(activateButton);
    fireEvent.press(activateButton);

    await waitFor(() => {
      expect(marketplaceAPI.toggleListingAvailability).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveToggle({ data: { listing: { id: 23, isActive: true, availability: true } } });
    });
  });
});
