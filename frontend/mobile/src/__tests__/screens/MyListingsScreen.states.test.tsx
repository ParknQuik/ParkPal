import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
});
