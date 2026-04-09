import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';

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