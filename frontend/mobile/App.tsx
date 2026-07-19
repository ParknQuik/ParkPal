import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notifications';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/context/ThemeContext';
import { loadThemeMode } from './src/store/slices/settingsSlice';

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

        // Load persisted theme preference
        await store.dispatch(loadThemeMode());
        
        await notificationService.configureNotificationHandler();

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
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider>
            <SafeAreaProvider>
              <ErrorBoundary>
                <AppNavigator />
              </ErrorBoundary>
              <StatusBar style="auto" />
            </SafeAreaProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}