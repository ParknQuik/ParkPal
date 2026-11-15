import * as Location from 'expo-location';
import { AppState } from 'react-native';
import GeofenceService from '../../services/analyticsGeofenceService';
import { enterZone, exitZone, logActivity } from '../../store/slices/analyticsSlice';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

jest.mock('../../store/slices/analyticsSlice', () => ({
  enterZone: jest.fn((payload) => ({ type: 'enter', payload })),
  exitZone: jest.fn((payload) => ({ type: 'exit', payload })),
  logActivity: jest.fn((payload) => ({ type: 'activity', payload })),
}));

jest.mock('../../../modules/parking-activity-recognition/src', () => ({
  requestPermission: jest.fn().mockResolvedValue(true),
  startActivityUpdates: jest.fn(),
  stopActivityUpdates: jest.fn(),
}));

const zone = {
  id: 12,
  name: 'Verified lot',
  geofencePolygon: [
    { latitude: 14.5, longitude: 121 },
    { latitude: 14.6, longitude: 121 },
    { latitude: 14.6, longitude: 121.1 },
    { latitude: 14.5, longitude: 121 },
  ],
} as any;

const location = {
  coords: { latitude: 14.55, longitude: 121.05, speed: 3 },
} as Location.LocationObject;

describe('AnalyticsGeofenceService foreground lifecycle', () => {
  let stateListener: ((state: string) => void) | undefined;
  let positionListener: ((value: Location.LocationObject) => void) | undefined;
  let activityListener: ((event: { activityType: string; confidence: number }) => void) | undefined;
  let resolveEntry: ((value: { sessionId: number }) => void) | undefined;
  let deferEntry = true;
  const dispatch = jest.fn((action: any) => ({
    unwrap: () => action.type === 'enter' && deferEntry
      ? new Promise<{ sessionId: number }>((resolve) => { resolveEntry = resolve; })
      : Promise.resolve(action.type === 'enter' ? { sessionId: 101 } : {}),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    (AppState as any).currentState = 'active';
    (AppState.addEventListener as jest.Mock).mockImplementation((_event, listener) => {
      stateListener = listener;
      return { remove: jest.fn() };
    });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.watchPositionAsync as jest.Mock).mockImplementation((_options, listener) => {
      positionListener = listener;
      return Promise.resolve({ remove: jest.fn() });
    });
    const activityModule = require('../../../modules/parking-activity-recognition/src');
    activityModule.startActivityUpdates.mockImplementation((listener: typeof activityListener) => {
      activityListener = listener;
      return Promise.resolve();
    });
    dispatch.mockClear();
    resolveEntry = undefined;
    deferEntry = true;
    activityListener = undefined;
    positionListener = undefined;
    stateListener = undefined;
  });

  afterEach(() => GeofenceService.stop());

  it('closes a late zone entry if the app backgrounds while the request is pending', async () => {
    await GeofenceService.start([zone], 7, dispatch as any);
    positionListener?.(location);
    await Promise.resolve();

    stateListener?.('background');
    resolveEntry?.({ sessionId: 99 });
    await Promise.resolve();
    await Promise.resolve();

    expect(exitZone).toHaveBeenCalledWith({ sessionId: 99 });
    expect(logActivity).not.toHaveBeenCalled();
    expect(GeofenceService.isRunning()).toBe(false);
  });

  it('logs the native activity classification and confidence for a verified zone session', async () => {
    deferEntry = false;
    await GeofenceService.start([zone], 7, dispatch as any);
    positionListener?.(location);
    await Promise.resolve();
    await Promise.resolve();
    activityListener?.({ activityType: 'ON_FOOT', confidence: 87 });

    expect(logActivity).toHaveBeenCalledWith({
      userId: 7,
      sessionId: 101,
      activityType: 'ON_FOOT',
      confidence: 87,
      latitude: 14.55,
      longitude: 121.05,
    });
  });

  it('does not create analytics sessions when motion permission is denied', async () => {
    const activityModule = require('../../../modules/parking-activity-recognition/src');
    activityModule.requestPermission.mockResolvedValue(false);
    await GeofenceService.start([zone], 7, dispatch as any);
    positionListener?.(location);
    await Promise.resolve();
    await Promise.resolve();

    expect(enterZone).not.toHaveBeenCalled();
    expect(activityModule.startActivityUpdates).not.toHaveBeenCalled();
  });
});
