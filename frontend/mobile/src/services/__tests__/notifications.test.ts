import { createNotificationService, type ExpoNotificationsModule } from '../notificationServiceFactory';

const makeService = ({ expoGo = false, overrides = {} }: { expoGo?: boolean; overrides?: Record<string, unknown> } = {}) => {
  const notifications = {
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
    setNotificationHandler: jest.fn(),
    ...overrides,
  };
  const loadNotifications = jest.fn(() => notifications as unknown as ExpoNotificationsModule);
  const service = createNotificationService({
    isExpoGo: () => expoGo,
    loadNotifications,
    getProjectId: () => 'eas-project-id',
  });
  return { service, notifications, loadNotifications };
};

describe('notificationService', () => {
  it('does not load or call remote push APIs in Expo Go', async () => {
    const { service, notifications, loadNotifications } = makeService({ expoGo: true });
    await expect(service.getPushToken()).resolves.toBeNull();
    await expect(service.scheduleNotification('Title', 'Body')).resolves.toBe('');
    await expect(service.cancelAllNotifications()).resolves.toBeUndefined();
    await expect(service.configureNotificationHandler()).resolves.toBeUndefined();
    service.addNotificationReceivedListener(jest.fn()).remove();
    service.addNotificationResponseListener(jest.fn()).remove();
    expect(loadNotifications).not.toHaveBeenCalled();
    expect(notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(notifications.setNotificationHandler).not.toHaveBeenCalled();
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(notifications.addNotificationReceivedListener).not.toHaveBeenCalled();
    expect(notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });

  it('requests permissions and retrieves the Expo push token in native builds', async () => {
    const { service, notifications } = makeService({ overrides: {
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    } });
    await expect(service.getPushToken()).resolves.toBe('ExponentPushToken[test]');
    expect(notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas-project-id' });
  });

  it('returns null when notification permissions are denied', async () => {
    const { service, notifications } = makeService({ overrides: {
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
    } });
    await expect(service.getPushToken()).resolves.toBeNull();
    expect(notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('returns null when Expo push token validation fails', async () => {
    const { service, notifications } = makeService({ overrides: {
      getExpoPushTokenAsync: jest.fn().mockRejectedValue({ code: 'VALIDATION_ERROR' }),
    } });
    await expect(service.getPushToken()).resolves.toBeNull();
    expect(notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
  });
});
