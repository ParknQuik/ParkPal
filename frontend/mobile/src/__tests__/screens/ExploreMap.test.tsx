import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import { ExploreMap } from '../../screens/ExploreMap';
import { useAppDispatch, useAppSelector } from '../../store';
import { searchListings } from '../../store/slices/marketplaceSlice';
import { marketplaceAPI } from '../../services/api';

const mockNavigate = jest.fn();
let mockRouteParams: any = {};

jest.mock('../../store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../store/slices/marketplaceSlice', () => ({
  searchListings: jest.fn(),
}));

jest.mock('../../store/slices/analyticsSlice', () => ({
  fetchZoneAvailability: jest.fn((payload) => ({
    type: 'analytics/fetchZoneAvailability',
    payload,
    unwrap: jest.fn().mockResolvedValue(payload),
  })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef(({ children, onMapReady, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));

    return (
      <View testID="map-view" onMapReady={onMapReady} {...props}>
        {children}
      </View>
    );
  });

  return {
    __esModule: true,
    default: MockMapView,
    Marker: ({ children, onPress }: any) => <View onTouchEnd={onPress}>{children}</View>,
    Circle: () => <View />,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
  },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      background: '#ffffff',
      white: '#ffffff',
      primary: '#10b77f',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      border: '#e5e7eb',
      error: '#ef4444',
    },
  }),
}));

jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isConnected: true }),
}));

jest.mock('../../hooks/useSearchHistory', () => ({
  useSearchHistory: () => ({
    history: [],
    addToHistory: jest.fn(),
    clearHistory: jest.fn(),
    removeFromHistory: jest.fn(),
  }),
}));

jest.mock('../../hooks/useAutocomplete', () => ({
  useAutocomplete: () => [],
}));

jest.mock('../../hooks/useAnalyticsGeofencing', () => ({
  useAnalyticsGeofencing: () => ({
    currentZone: null,
    sessionId: null,
  }),
}));

jest.mock('../../services/analytics', () => ({
  analyticsService: {
    getZones: jest.fn().mockResolvedValue([]),
    getZoneAvailability: jest.fn(),
  },
}));

jest.mock('../../services/api', () => ({
  marketplaceAPI: {
    getDiscoveryCandidates: jest.fn(),
  },
}));

jest.mock('../../components/FilterChips', () => ({
  FilterChips: () => null,
}));

jest.mock('../../components/FilterModal', () => ({
  FilterModal: () => null,
}));

jest.mock('../../components/ListingBottomSheet', () => ({
  ListingBottomSheet: () => null,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
  },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialCommunityIcons: ({ name }: { name?: string }) => <Text>{name}</Text>,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;
const mockSearchListings = searchListings as unknown as jest.Mock;
const mockGetDiscoveryCandidates = marketplaceAPI.getDiscoveryCandidates as jest.Mock;
const mockLocation = Location as jest.Mocked<typeof Location>;

const createAction = (payload: unknown, unwrap?: jest.Mock) => ({
  type: 'marketplace/searchListings',
  payload,
  unwrap: unwrap || jest.fn().mockResolvedValue(payload),
});

const locationObject = (latitude: number, longitude: number) => ({
  coords: {
    latitude,
    longitude,
    altitude: null,
    accuracy: 5,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

const baseState: any = {
  marketplace: {
    listings: [],
    loading: false,
    error: null,
  },
  analytics: {
    zoneAvailability: {},
  },
};

const setState = (state: any = baseState) => {
  mockUseAppSelector.mockImplementation((selector) => selector(state));
};

const renderExploreMap = () => {
  const utils = render(<ExploreMap />);
  fireEvent(utils.getByTestId('map-view'), 'onMapReady');
  return utils;
};

describe('ExploreMap location and refresh behavior', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    setState();
    mockDispatch = jest.fn((action) => action);
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockSearchListings.mockImplementation((payload) => createAction(payload));
    mockGetDiscoveryCandidates.mockResolvedValue({ data: { data: [] } });
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(locationObject(14.6, 120.98) as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue(locationObject(14.7, 120.99) as any);
  });

  it('centers startup without route params on device GPS context', async () => {
    renderExploreMap();

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledWith({
      latitude: 14.6,
      longitude: 120.98,
      radius: 3,
    }));
  });

  it('focuses route coordinates once, while the location button recenters to GPS', async () => {
    mockRouteParams = {
      latitude: 14.51,
      longitude: 121.01,
      focusSpotId: 55,
    };

    const { getByLabelText } = renderExploreMap();

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledWith({
      latitude: 14.51,
      longitude: 121.01,
      radius: 3,
    }));
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText('Recenter map to GPS location'));

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledWith({
      latitude: 14.7,
      longitude: 120.99,
      radius: 3,
    }));
  });

  it('shows a clear state when location permission is denied', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

    const { getByText } = renderExploreMap();

    await waitFor(() => {
      expect(getByText('Unable to resolve your GPS position. Enable location services or search an area.')).toBeTruthy();
    });
  });

  it('coalesces repeated search-area refresh taps during the cooldown window', async () => {
    mockRouteParams = {
      latitude: 14.51,
      longitude: 121.01,
    };
    const { getByLabelText, getByTestId } = renderExploreMap();

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledTimes(1));
    fireEvent(getByTestId('map-view'), 'onRegionChangeComplete', {
      latitude: 14.52,
      longitude: 121.02,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    await waitFor(() => expect(getByLabelText('Search this area for parking spots')).toBeTruthy());

    const searchAreaButton = getByLabelText('Search this area for parking spots');
    fireEvent.press(searchAreaButton);
    fireEvent.press(searchAreaButton);

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledTimes(2));
  });

  it('keeps existing markers visible and shows a soft notice when refresh is rate limited', async () => {
    setState({
      ...baseState,
      marketplace: {
        ...baseState.marketplace,
        listings: [{
          id: 1,
          title: 'Existing Garage',
          address: 'Existing Garage',
          latitude: 14.51,
          longitude: 121.01,
          pricePerHour: 50,
        }],
      },
    });
    mockSearchListings.mockImplementation((payload) => createAction(
      payload,
      jest.fn().mockRejectedValue(new Error('Request failed with status code 429'))
    ));

    const { getByLabelText, getByText } = renderExploreMap();

    await waitFor(() => expect(getByLabelText('Existing Garage: ₱50 per hour')).toBeTruthy());
    await waitFor(() => {
      expect(getByText('Map refreshes are busy. Showing the latest parking results we already have.')).toBeTruthy();
    });
  });
});
