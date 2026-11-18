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

const renderExploreMap = async () => {
  const utils = await render(<ExploreMap />);
  await fireEvent(utils.getByTestId('map-view'), 'onMapReady');
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
    await renderExploreMap();

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 14.6,
      longitude: 120.98,
      radius: 3,
    })));
  });

  it('focuses route coordinates once, while the location button recenters to GPS', async () => {
    mockRouteParams = {
      latitude: 14.51,
      longitude: 121.01,
      focusSpotId: 55,
    };

    const { getByLabelText } = await renderExploreMap();

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 14.51,
      longitude: 121.01,
      radius: 3,
    })));
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();

    await fireEvent.press(getByLabelText('Recenter map to GPS location'));

    await waitFor(() => expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalled());
    expect(mockSearchListings).toHaveBeenCalledTimes(1);
  });

  it('shows a clear state when location permission is denied', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

    const { getByText } = await renderExploreMap();

    await waitFor(() => {
      expect(getByText('Unable to resolve your GPS position. Enable location services or search an area.')).toBeTruthy();
    });
  });

  it('coalesces repeated search-area refresh taps during the cooldown window', async () => {
    mockRouteParams = {
      latitude: 14.51,
      longitude: 121.01,
    };
    const { getByLabelText, getByTestId } = await renderExploreMap();

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledTimes(1));
    await fireEvent(getByTestId('map-view'), 'onRegionChangeComplete', {
      latitude: 14.52,
      longitude: 121.02,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    await waitFor(() => expect(getByLabelText('Search this area for parking spots')).toBeTruthy());

    const searchAreaButton = getByLabelText('Search this area for parking spots');
    await fireEvent.press(searchAreaButton);
    await fireEvent.press(searchAreaButton);

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

    const { getByLabelText, getByText } = await renderExploreMap();

    await waitFor(() => expect(getByLabelText('Existing Garage: ₱50 per hour')).toBeTruthy());
    await waitFor(() => {
      expect(getByText('Map refreshes are busy. Showing the latest parking results we already have.')).toBeTruthy();
    });
  });
  const externalFacility = {
    id: 8, title: 'External Garage', latitude: 14.6, longitude: 120.98,
    source: 'google_candidate', isPreview: true, canBook: false, canShowAnalytics: false,
    attribution: 'Google Maps',
  };

  it('discovers external facilities on open despite a failed host search', async () => {
    mockSearchListings.mockImplementation((payload) => createAction(payload, jest.fn().mockRejectedValue(new Error('host failed'))));
    mockGetDiscoveryCandidates.mockResolvedValue({ data: { data: [externalFacility] } });
    const { getByLabelText, getByText } = await renderExploreMap();
    await waitFor(() => expect(getByLabelText('External Garage. Nearby facility preview, not bookable.')).toBeTruthy(), { timeout: 2000 });
    expect(mockGetDiscoveryCandidates).toHaveBeenCalledWith(expect.objectContaining({ south: expect.closeTo(14.595), north: expect.closeTo(14.605) }));
    expect(getByText(/Google Maps/)).toBeTruthy();
  });

  it('keeps discovery stable during camera movement until Search this area', async () => {
    const { getByTestId, getByText } = await renderExploreMap();
    await waitFor(() => expect(mockGetDiscoveryCandidates).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const region = { latitude: 14.62, longitude: 120.99, latitudeDelta: 0.02, longitudeDelta: 0.03 };
    await fireEvent(getByTestId('map-view'), 'onRegionChangeComplete', region);
    expect(mockGetDiscoveryCandidates).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getByText('Search this area')).toBeTruthy());
    await fireEvent.press(getByText('Search this area'));
    await waitFor(() => expect(mockGetDiscoveryCandidates).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(mockGetDiscoveryCandidates).toHaveBeenLastCalledWith(expect.objectContaining({ south: expect.closeTo(14.61), north: expect.closeTo(14.63) }));
    await fireEvent(getByTestId('map-view'), 'onRegionChangeComplete', { ...region });
    expect(mockGetDiscoveryCandidates).toHaveBeenCalledTimes(2);
  });

  it('retains host pins on discovery failure and distinguishes retry success from failure', async () => {
    setState({ ...baseState, marketplace: { ...baseState.marketplace, listings: [{
      id: 1, title: 'Host Garage', latitude: 14.6, longitude: 120.98, pricePerHour: 50,
    }] } });
    mockGetDiscoveryCandidates.mockRejectedValueOnce(new Error('provider failed')).mockResolvedValue({ data: { data: [] } });
    const { getByLabelText, getByText, queryByText } = await renderExploreMap();
    expect(queryByText(/No external parking facilities/)).toBeNull();
    await waitFor(() => expect(getByLabelText('Retry parking facility discovery')).toBeTruthy(), { timeout: 2000 });
    expect(getByLabelText('Host Garage: ₱50 per hour')).toBeTruthy();
    expect(queryByText(/No external parking facilities/)).toBeNull();
    await fireEvent.press(getByLabelText('Retry parking facility discovery'));
    await waitFor(() => expect(getByText(/No external parking facilities found/)).toBeTruthy(), { timeout: 2000 });
    expect(getByLabelText('Host Garage: ₱50 per hour')).toBeTruthy();
  });

});
