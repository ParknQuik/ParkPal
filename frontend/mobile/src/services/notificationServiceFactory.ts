import type {
  Subscription,
  Notification,
  NotificationBehavior,
  NotificationResponse,
} from 'expo-notifications';

export type ExpoNotificationsModule = typeof import('expo-notifications');

const noopSubscription: Subscription = { remove: () => {} };

export const createNotificationService = ({
  isExpoGo,
  loadNotifications,
  getProjectId,
}: {
  isExpoGo: () => boolean;
  loadNotifications: () => ExpoNotificationsModule;
  getProjectId: () => string | undefined;
}) => {
  let notificationsModule: ExpoNotificationsModule | null = null;
  const getNotifications = (): ExpoNotificationsModule | null => {
    if (isExpoGo()) return null;
    notificationsModule ??= loadNotifications();
    return notificationsModule;
  };

  return {
    isExpoGo,

    async configureNotificationHandler(): Promise<void> {
      const Notifications = getNotifications();
      if (!Notifications) return;
      Notifications.setNotificationHandler({
        handleNotification: async (): Promise<NotificationBehavior> => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    },

    async getPushToken(): Promise<string | null> {
      const Notifications = getNotifications();
      if (!Notifications) return null;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return null;
        const projectId = getProjectId();
        const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        return token.data;
      } catch {
        return null;
      }
    },

    async registerPushToken(_pushToken: string, _userId: number): Promise<void> {},

    async scheduleNotification(title: string, body: string, data?: Record<string, unknown>): Promise<string> {
      const Notifications = getNotifications();
      if (!Notifications) return '';
      return Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
    },

    async cancelAllNotifications(): Promise<void> {
      const Notifications = getNotifications();
      if (!Notifications) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
    },

    addNotificationReceivedListener(callback: (notification: Notification) => void): Subscription {
      return getNotifications()?.addNotificationReceivedListener(callback) ?? noopSubscription;
    },

    addNotificationResponseListener(callback: (response: NotificationResponse) => void): Subscription {
      return getNotifications()?.addNotificationResponseReceivedListener(callback) ?? noopSubscription;
    },
  };
};
