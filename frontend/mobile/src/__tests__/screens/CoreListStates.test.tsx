import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HomeDashboard } from '../../screens/HomeDashboard';
import { MyBookingsScreen } from '../../screens/MyBookingsScreen';
import { MyVehiclesScreen } from '../../screens/MyVehiclesScreen';
import { PointsHistoryScreen } from '../../screens/PointsHistoryScreen';
import { useAppDispatch, useAppSelector } from '../../store';
import { searchListings, getMyBookings } from '../../store/slices/marketplaceSlice';
import { fetchBehaviorStatus } from '../../store/slices/behaviorSlice';
import { getCurrentLocation } from '../../store/slices/locationSlice';
import { getVehicles, setDefaultVehicle } from '../../store/slices/vehiclesSlice';
import { fetchHistory } from '../../store/slices/pointsSlice';

const mockNavigate = jest.fn();

jest.mock('../../store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../store/slices/marketplaceSlice', () => ({
  searchListings: jest.fn(),
  getMyBookings: jest.fn(),
}));

jest.mock('../../store/slices/behaviorSlice', () => ({
  fetchBehaviorStatus: jest.fn(),
}));

jest.mock('../../store/slices/locationSlice', () => ({
  getCurrentLocation: jest.fn(),
}));

jest.mock('../../store/slices/vehiclesSlice', () => ({
  getVehicles: jest.fn(),
  deleteVehicle: jest.fn(),
  setDefaultVehicle: jest.fn(),
}));

jest.mock('../../store/slices/pointsSlice', () => ({
  fetchHistory: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  marketplaceAPI: {
    getDiscoveryCandidates: jest.fn(),
  },
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

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const Icon = ({ name }: { name?: string }) => <Text>{name}</Text>;

  return {
    MaterialIcons: Icon,
    MaterialCommunityIcons: Icon,
  };
});

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
    medium: jest.fn(),
  },
}));

jest.mock('../../utils/performance', () => ({
  useDebouncedCallback: (callback: (...args: any[]) => void) => callback,
}));

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;
const mockSearchListings = searchListings as unknown as jest.Mock;
const mockGetMyBookings = getMyBookings as unknown as jest.Mock;
const mockFetchBehaviorStatus = fetchBehaviorStatus as unknown as jest.Mock;
const mockGetCurrentLocation = getCurrentLocation as unknown as jest.Mock;
const mockGetVehicles = getVehicles as unknown as jest.Mock;
const mockSetDefaultVehicle = setDefaultVehicle as unknown as jest.Mock;
const mockFetchHistory = fetchHistory as unknown as jest.Mock;
const { marketplaceAPI } = require('../../services/api');
const mockGetDiscoveryCandidates = marketplaceAPI.getDiscoveryCandidates as jest.Mock;

const createAction = (type: string, payload?: unknown) => ({
  type,
  payload,
  unwrap: jest.fn().mockResolvedValue(payload),
});

const createRejectedAction = (type: string, error: Error) => ({
  type,
  unwrap: jest.fn().mockRejectedValue(error),
});

const baseState: any = {
  auth: {
    user: {
      id: 'user-1',
      name: 'Test User',
      totalSpent: 0,
    },
  },
  behavior: {
    status: null,
    loading: false,
    error: null,
    lastFetchedAt: null,
  },
  location: {
    currentLocation: {
      latitude: 14.5995,
      longitude: 120.9842,
    },
  },
  marketplace: {
    listings: [],
    bookings: [],
    myListings: [],
    filters: {
      sortBy: 'distance',
    },
    loading: false,
    error: null,
  },
  vehicles: {
    vehicles: [],
    loading: false,
    error: null,
  },
  points: {
    transactions: [],
    loading: false,
    balance: null,
    referralStats: null,
    referralCode: null,
    error: null,
  },
};

const setState = (overrides: Partial<typeof baseState>) => {
  const state = {
    ...baseState,
    ...overrides,
    auth: {
      ...baseState.auth,
      ...overrides.auth,
    },
    behavior: {
      ...baseState.behavior,
      ...overrides.behavior,
    },
    location: {
      ...baseState.location,
      ...overrides.location,
    },
    marketplace: {
      ...baseState.marketplace,
      ...overrides.marketplace,
    },
    vehicles: {
      ...baseState.vehicles,
      ...overrides.vehicles,
    },
    points: {
      ...baseState.points,
      ...overrides.points,
    },
  };

  mockUseAppSelector.mockImplementation((selector) => selector(state));
};

describe('core mobile list loading and failure states', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDispatch = jest.fn((action) => action);
    mockUseAppDispatch.mockReturnValue(mockDispatch);

    mockSearchListings.mockImplementation((payload) => createAction('marketplace/searchListings', payload));
    mockGetMyBookings.mockImplementation(() => createAction('marketplace/getMyBookings'));
    mockFetchBehaviorStatus.mockImplementation(() => createAction('behavior/fetchStatus'));
    mockGetCurrentLocation.mockImplementation(() => createAction('location/getCurrentLocation', {
      latitude: 14.5995,
      longitude: 120.9842,
    }));
    mockGetVehicles.mockImplementation(() => createAction('vehicles/getVehicles'));
    mockSetDefaultVehicle.mockImplementation((payload) => createAction('vehicles/setDefaultVehicle', payload));
    mockFetchHistory.mockImplementation((payload) => createAction('points/fetchHistory', payload));
    mockGetDiscoveryCandidates.mockReturnValue(new Promise(() => {}));
  });

  it('shows parking skeletons and retries loading nearby parking', async () => {
    setState({
      marketplace: {
        ...baseState.marketplace,
        loading: true,
      },
    });

    const { getByLabelText, getAllByTestId, rerender } = render(<HomeDashboard />);

    expect(getByLabelText('Loading nearby parking')).toBeTruthy();
    expect(getAllByTestId('parking-skeleton-card')).toHaveLength(3);

    setState({
      marketplace: {
        ...baseState.marketplace,
        error: 'Network request failed',
      },
    });
    rerender(<HomeDashboard />);

    fireEvent.press(getByLabelText('Retry loading parking spots'));

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledWith({
      latitude: 14.5995,
      longitude: 120.9842,
      radius: 3,
    }));
  });

  it('shows a location-needed state without fetching nearby parking when location is unavailable', async () => {
    setState({
      location: {
        currentLocation: null,
      },
    });
    mockGetCurrentLocation.mockImplementation(() =>
      createRejectedAction('location/getCurrentLocation/rejected', new Error('permission denied'))
    );

    const { getByText } = render(<HomeDashboard />);

    await waitFor(() => expect(getByText('Enable location or search an area to find nearby parking.')).toBeTruthy());
    expect(mockSearchListings).not.toHaveBeenCalled();
    expect(mockGetDiscoveryCandidates).not.toHaveBeenCalled();
  });

  it('fetches nearby listings and candidates when location resolves from the device', async () => {
    setState({
      location: {
        currentLocation: null,
      },
    });
    mockGetCurrentLocation.mockImplementation(() => createAction('location/getCurrentLocation', {
      latitude: 37.3323,
      longitude: -122.0312,
    }));
    mockGetDiscoveryCandidates.mockResolvedValue({
      data: {
        data: [],
      },
    });

    render(<HomeDashboard />);

    await waitFor(() => expect(mockSearchListings).toHaveBeenCalledWith({
      latitude: 37.3323,
      longitude: -122.0312,
      radius: 3,
    }));
    expect(mockGetDiscoveryCandidates).toHaveBeenCalledWith({
      lat: 37.3323,
      lon: -122.0312,
      radius: 3,
    });
  });

  it('renders ParkPal listings before preview candidates in nearby parking', async () => {
    setState({
      marketplace: {
        ...baseState.marketplace,
        listings: [
          {
            id: 10,
            title: 'Bookable Garage',
            description: '',
            address: 'Bookable Garage',
            latitude: 14.5995,
            longitude: 120.9842,
            pricePerHour: 120,
            photos: [],
            amenities: [],
            hostId: 1,
            hostName: 'Host',
            rating: 4.5,
            reviewCount: 3,
            distance: 0.2,
            availability: true,
          },
        ],
      },
    });
    mockGetDiscoveryCandidates.mockResolvedValue({
      data: {
        data: [
          {
            id: 99,
            source: 'google_candidate',
            canBook: false,
            canShowAnalytics: false,
            isPreview: true,
            latitude: 14.6,
            longitude: 120.985,
            title: 'Candidate Lot',
            address: 'Candidate Address',
          },
        ],
      },
    });

    const { getByText, getAllByText } = render(<HomeDashboard />);

    await waitFor(() => expect(getByText('Candidate Lot')).toBeTruthy());
    expect(getByText('Bookable Garage')).toBeTruthy();
    expect(getByText('Available')).toBeTruthy();
    expect(getByText('Not bookable yet')).toBeTruthy();
    expect(getAllByText('Preview')).toHaveLength(1);
    expect(getByText('2')).toBeTruthy();
  });

  it('shows account-standing warning on Home when renter has strikes', () => {
    setState({
      behavior: {
        ...baseState.behavior,
        status: {
          noShowCount: 1,
          lateCancelCount: 0,
          totalStrikes: 1,
          isSuspended: false,
          suspendedUntil: null,
          lastStrikeAt: '2026-05-25T00:00:00.000Z',
          strikeResetDays: 30,
          policySummary: {
            warning: '1 strike triggers warning status.',
            suspension: '3 strikes pause booking access.',
            noShow: 'No-show bookings add one strike.',
            lateCancellation: 'Late cancellations add one strike.',
            reset: 'Strikes reset after 30 days.',
          },
        },
      },
    });

    const { getByTestId, getByText } = render(<HomeDashboard />);

    expect(getByTestId('home-account-standing-banner')).toBeTruthy();
    expect(getByText('Warning')).toBeTruthy();
    expect(getByText('1 strike on record. Cancel early and check in on time to avoid booking pauses.')).toBeTruthy();
  });

  it('navigates listing rows to detail and candidate rows to Explore focus params', async () => {
    setState({
      marketplace: {
        ...baseState.marketplace,
        listings: [
          {
            id: 10,
            title: 'Bookable Garage',
            description: '',
            address: 'Bookable Garage',
            latitude: 14.5995,
            longitude: 120.9842,
            pricePerHour: 120,
            photos: [],
            amenities: [],
            hostId: 1,
            hostName: 'Host',
            rating: 4.5,
            reviewCount: 3,
            distance: 0.2,
            availability: true,
          },
        ],
      },
    });
    mockGetDiscoveryCandidates.mockResolvedValue({
      data: {
        data: [
          {
            id: 99,
            source: 'google_candidate',
            canBook: false,
            canShowAnalytics: false,
            isPreview: true,
            latitude: 14.6,
            longitude: 120.985,
            title: 'Candidate Lot',
            address: 'Candidate Address',
          },
        ],
      },
    });

    const { getByLabelText } = render(<HomeDashboard />);

    fireEvent.press(getByLabelText('Bookable Garage'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ParkingDetail', { spotId: '10' }));

    await waitFor(() => expect(getByLabelText('Candidate Lot. Preview parking candidate, not bookable')).toBeTruthy());
    fireEvent.press(getByLabelText('Candidate Lot. Preview parking candidate, not bookable'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Explore', {
      candidateId: 99,
      latitude: 14.6,
      longitude: 120.985,
    }));
  });

  it('keeps bookable listings visible when candidate discovery fails', async () => {
    setState({
      marketplace: {
        ...baseState.marketplace,
        listings: [
          {
            id: 10,
            title: 'Bookable Garage',
            description: '',
            address: 'Bookable Garage',
            latitude: 14.5995,
            longitude: 120.9842,
            pricePerHour: 120,
            photos: [],
            amenities: [],
            hostId: 1,
            hostName: 'Host',
            rating: 4.5,
            reviewCount: 3,
            distance: 0.2,
            availability: true,
          },
        ],
      },
    });
    mockGetDiscoveryCandidates.mockRejectedValue(new Error('candidate fetch failed'));

    const { getByText, queryByText } = render(<HomeDashboard />);

    await waitFor(() => expect(mockGetDiscoveryCandidates).toHaveBeenCalled());
    expect(getByText('Bookable Garage')).toBeTruthy();
    expect(queryByText('Not bookable yet')).toBeNull();
  });

  it('shows booking skeletons and retries loading bookings', () => {
    setState({
      marketplace: {
        ...baseState.marketplace,
        loading: true,
      },
    });

    const { getByLabelText, getAllByTestId, rerender } = render(<MyBookingsScreen />);

    expect(getByLabelText('Loading bookings')).toBeTruthy();
    expect(getAllByTestId('booking-skeleton-card')).toHaveLength(3);

    setState({
      marketplace: {
        ...baseState.marketplace,
        error: 'Network request failed',
      },
    });
    rerender(<MyBookingsScreen />);

    fireEvent.press(getByLabelText('Retry loading bookings'));

    expect(mockGetMyBookings).toHaveBeenCalled();
  });

  it('shows vehicle skeletons and retries loading vehicles', () => {
    setState({
      vehicles: {
        ...baseState.vehicles,
        loading: true,
      },
    });

    const { getByLabelText, getAllByTestId, rerender } = render(<MyVehiclesScreen />);

    expect(getByLabelText('Loading vehicles')).toBeTruthy();
    expect(getAllByTestId('vehicle-skeleton-card')).toHaveLength(3);

    setState({
      vehicles: {
        ...baseState.vehicles,
        error: 'Network request failed',
      },
    });
    rerender(<MyVehiclesScreen />);

    fireEvent.press(getByLabelText('Retry loading vehicles'));

    expect(mockGetVehicles).toHaveBeenCalled();
  });

  it('shows the My Vehicles empty state action', () => {
    setState({
      vehicles: {
        ...baseState.vehicles,
        vehicles: [],
      },
    });

    const { getByText } = render(<MyVehiclesScreen />);

    expect(getByText('No vehicles yet')).toBeTruthy();
    expect(getByText('Add Your First Vehicle')).toBeTruthy();
  });

  it('renders polished vehicle cards with details and actions', () => {
    setState({
      vehicles: {
        ...baseState.vehicles,
        vehicles: [
          {
            id: 1,
            userId: 1,
            year: 2024,
            make: 'Toyota',
            model: 'Corolla Hybrid',
            color: 'Silver',
            licensePlate: 'ABC-1234',
            imageUrl: null,
            isDefault: true,
            createdAt: '2026-05-24T00:00:00.000Z',
            updatedAt: '2026-05-24T00:00:00.000Z',
          },
          {
            id: 2,
            userId: 1,
            year: 2020,
            make: 'Honda',
            model: 'Civic',
            color: 'Blue',
            licensePlate: 'LONG-PLATE-777',
            imageUrl: null,
            isDefault: false,
            createdAt: '2026-05-24T00:00:00.000Z',
            updatedAt: '2026-05-24T00:00:00.000Z',
          },
        ],
      },
    });

    const { getByText, getAllByText, queryAllByText } = render(<MyVehiclesScreen />);

    expect(getByText('2024 Toyota Corolla Hybrid')).toBeTruthy();
    expect(getByText('ABC-1234')).toBeTruthy();
    expect(getByText('Silver')).toBeTruthy();
    expect(getByText('Default')).toBeTruthy();
    expect(getByText('2020 Honda Civic')).toBeTruthy();
    expect(getByText('LONG-PLATE-777')).toBeTruthy();
    expect(getByText('Blue')).toBeTruthy();
    expect(getAllByText('Edit')).toHaveLength(2);
    expect(getAllByText('Delete')).toHaveLength(2);
    expect(queryAllByText('Set Default')).toHaveLength(1);
  });

  it('sets a non-default vehicle as default through the existing thunk', () => {
    setState({
      vehicles: {
        ...baseState.vehicles,
        vehicles: [
          {
            id: 2,
            userId: 1,
            year: 2020,
            make: 'Honda',
            model: 'Civic',
            color: 'Blue',
            licensePlate: 'ABC-123',
            imageUrl: null,
            isDefault: false,
            createdAt: '2026-05-24T00:00:00.000Z',
            updatedAt: '2026-05-24T00:00:00.000Z',
          },
        ],
      },
    });

    const { getByText } = render(<MyVehiclesScreen />);

    fireEvent.press(getByText('Set Default'));

    expect(mockSetDefaultVehicle).toHaveBeenCalledWith(2);
  });

  it('shows transaction skeletons and retries loading points history', () => {
    setState({
      points: {
        ...baseState.points,
        loading: true,
      },
    });

    const { getByLabelText, getAllByTestId, rerender } = render(<PointsHistoryScreen />);

    expect(getByLabelText('Loading points history')).toBeTruthy();
    expect(getAllByTestId('transaction-skeleton-row')).toHaveLength(3);

    setState({
      points: {
        ...baseState.points,
        error: 'Network request failed',
      },
    });
    rerender(<PointsHistoryScreen />);

    fireEvent.press(getByLabelText('Retry loading points history'));

    expect(mockFetchHistory).toHaveBeenCalledWith({ page: 1, limit: 50 });
  });
});
