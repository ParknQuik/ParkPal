type NotificationMock = {
  addNotificationReceivedListener: jest.Mock;
  addNotificationResponseReceivedListener: jest.Mock;
  cancelAllScheduledNotificationsAsync: jest.Mock;
  getExpoPushTokenAsync: jest.Mock;
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  setNotificationHandler: jest.Mock;
};

const loadNotificationService = ({
  constantsOverrides = {},
  notificationOverrides = {},
}: {
  constantsOverrides?: Record<string, unknown>;
  notificationOverrides?: Partial<NotificationMock>;
} = {}) => {
  jest.resetModules();

  const mockConstants = {
    appOwnership: 'standalone',
    executionEnvironment: 'standalone',
    easConfig: { projectId: 'eas-project-id' },
    expoConfig: { extra: { eas: { projectId: 'expo-project-id' } } },
    ...constantsOverrides,
  };

  const mockNotifications: NotificationMock = {
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
    setNotificationHandler: jest.fn(),
    ...notificationOverrides,
  };

  let mockNotificationsLoaded = 0;

  jest.doMock('expo', () => ({
    isRunningInExpoGo: () =>
      mockConstants.appOwnership === 'expo' || mockConstants.executionEnvironment === 'storeClient',
  }));

  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: mockConstants,
  }));

  jest.doMock('expo-notifications', () => {
    mockNotificationsLoaded += 1;
    return mockNotifications;
  });

  const { notificationService } = require('../notifications');

  return {
    notificationService,
    mockNotifications,
    getNotificationsLoaded: () => mockNotificationsLoaded,
  };
};

describe('notificationService', () => {
  afterEach(() => {
    jest.dontMock('expo');
    jest.dontMock('expo-constants');
    jest.dontMock('expo-notifications');
  });

  it('does not load or call expo-notifications remote push APIs in Expo Go', async () => {
    const { notificationService, mockNotifications, getNotificationsLoaded } = loadNotificationService({
      constantsOverrides: {
        appOwnership: 'expo',
        executionEnvironment: 'storeClient',
      },
    });

    await expect(notificationService.getPushToken()).resolves.toBeNull();
    await expect(notificationService.scheduleNotification('Title', 'Body')).resolves.toBe('');
    await expect(notificationService.cancelAllNotifications()).resolves.toBeUndefined();
    await expect(notificationService.configureNotificationHandler()).resolves.toBeUndefined();

    const receivedSubscription = notificationService.addNotificationReceivedListener(jest.fn());
    const responseSubscription = notificationService.addNotificationResponseListener(jest.fn());
    receivedSubscription.remove();
    responseSubscription.remove();

    expect(getNotificationsLoaded()).toBe(0);
    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockNotifications.setNotificationHandler).not.toHaveBeenCalled();
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockNotifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.addNotificationReceivedListener).not.toHaveBeenCalled();
    expect(mockNotifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });

  it('requests permissions and retrieves the Expo push token in native builds', async () => {
    const { notificationService, mockNotifications } = loadNotificationService({
      notificationOverrides: {
        getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
        requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      },
    });

    await expect(notificationService.getPushToken()).resolves.toBe('ExponentPushToken[test]');

    expect(mockNotifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'eas-project-id',
    });
  });

  it('returns null when notification permissions are denied', async () => {
    const { notificationService, mockNotifications } = loadNotificationService({
      notificationOverrides: {
        getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
        requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
      },
    });

    await expect(notificationService.getPushToken()).resolves.toBeNull();

    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('returns null when Expo push token validation fails', async () => {
    const { notificationService, mockNotifications } = loadNotificationService({
      notificationOverrides: {
        getExpoPushTokenAsync: jest.fn().mockRejectedValue({ code: 'VALIDATION_ERROR' }),
      },
    });

    await expect(notificationService.getPushToken()).resolves.toBeNull();

    expect(mockNotifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
  });
});
