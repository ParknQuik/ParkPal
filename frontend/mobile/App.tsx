import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notifications';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Only clear navigation state and redux persist - NOT auth data
        // The user token and user data should persist across app reloads
        const keys = await AsyncStorage.getAllKeys();
        console.log('AsyncStorage keys:', keys);
        
        // Clear navigation state and redux persist (keep auth)
        const keysToRemove = keys.filter(key => 
          key.includes('@react-navigation/NavigationState') ||
          key.startsWith('reduxpersist:') ||
          key.startsWith('user_') // Only clear cache-related keys, not auth
        );
        
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
        
        console.log('Storage cleaned (auth preserved)');
        
        // Setup push notifications
        if (Device.isDevice) {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          
          if (finalStatus !== 'granted') {
            console.log('Failed to get push notification permissions');
          } else {
            console.log('Push notification permissions granted');
          }
        }

        // Configure notification handling
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        // Register push token if user is logged in
        const pushToken = await notificationService.getPushToken();
        if (pushToken) {
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            await notificationService.registerPushToken(pushToken, user.id);
          }
        }
      } catch (error) {
        console.warn('Failed to clean storage:', error);
      } finally {
        setIsReady(true);
      }
    };
    initializeApp();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}