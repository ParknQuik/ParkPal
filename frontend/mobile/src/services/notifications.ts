import * as Notifications from 'expo-notifications';
import type { NotificationBehavior } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const notificationService = {
  async getPushToken(): Promise<string | null> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  },

  async registerPushToken(pushToken: string, userId: number): Promise<void> {
    try {
      console.log('Would register push token:', pushToken, 'for user:', userId);
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  },

  async scheduleNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
    return id;
  },

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  },

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};