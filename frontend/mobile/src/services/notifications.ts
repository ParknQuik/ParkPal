import * as Notifications from 'expo-notifications';
import type { NotificationBehavior } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if running in Expo Go (not development build)
const IS_EXPO_GO = !process.env.EXPO_RUNTIME_VERSION?.startsWith('expo');

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
    // Skip push token in Expo Go (not supported in SDK 53+)
    if (IS_EXPO_GO) {
      console.log('Skipping push token in Expo Go (use development build for push)');
      return null;
    }
    
    try {
      // First request permission (not just check)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }
      
      // Try to get push token
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error: any) {
      // Check if it's the projectId error - silently fail
      if (error?.message?.includes('projectId') || error?.code === 'VALIDATION_ERROR') {
        console.log('Push notifications require EAS project setup');
        return null;
      }
      console.error('Failed to get push token:', error.message || error);
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