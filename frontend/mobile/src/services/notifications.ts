import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import type {
  Subscription,
  Notification,
  NotificationBehavior,
  NotificationResponse,
} from 'expo-notifications';

type ExpoNotificationsModule = typeof import('expo-notifications');

declare const require: (moduleName: string) => ExpoNotificationsModule;

const noopSubscription: Subscription = {
  remove: () => {},
};

let notificationsModule: ExpoNotificationsModule | null = null;

const isExpoGo = (): boolean => {
  const constants = Constants as typeof Constants & {
    appOwnership?: string | null;
    executionEnvironment?: string | null;
  };

  return (
    isRunningInExpoGo() ||
    constants.appOwnership === 'expo' ||
    constants.executionEnvironment === 'storeClient'
  );
};

const getNotifications = (): ExpoNotificationsModule | null => {
  if (isExpoGo()) {
    return null;
  }

  notificationsModule ??= require('expo-notifications');
  return notificationsModule;
};

const getProjectId = (): string | undefined => {
  const constants = Constants as typeof Constants & {
    easConfig?: { projectId?: string };
  };

  return constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
};

export const notificationService = {
  isExpoGo,

  async configureNotificationHandler(): Promise<void> {
    const Notifications = getNotifications();
    if (!Notifications) {
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async (): Promise<NotificationBehavior> => {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
  },

  async getPushToken(): Promise<string | null> {
    const Notifications = getNotifications();
    if (!Notifications) {
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const projectId = getProjectId();
      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      return token.data;
    } catch (error: any) {
      if (error?.message?.includes('projectId') || error?.code === 'VALIDATION_ERROR') {
        return null;
      }
      return null;
    }
  },

  async registerPushToken(pushToken: string, userId: number): Promise<void> {
    try {
      ;
    } catch (error) {
      ;
    }
  },

  async scheduleNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    const Notifications = getNotifications();
    if (!Notifications) {
      return '';
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
    return id;
  },

  async cancelAllNotifications(): Promise<void> {
    const Notifications = getNotifications();
    if (!Notifications) {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  addNotificationReceivedListener(callback: (notification: Notification) => void): Subscription {
    const Notifications = getNotifications();
    if (!Notifications) {
      return noopSubscription;
    }

    return Notifications.addNotificationReceivedListener(callback);
  },

  addNotificationResponseListener(callback: (response: NotificationResponse) => void): Subscription {
    const Notifications = getNotifications();
    if (!Notifications) {
      return noopSubscription;
    }

    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};
