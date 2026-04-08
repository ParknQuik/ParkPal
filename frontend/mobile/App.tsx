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
        // Clear all async storage to ensure fresh start
        const keys = await AsyncStorage.getAllKeys();
        console.log('AsyncStorage keys:', keys);
        
        // Clear navigation state and redux persist if any
        await AsyncStorage.multiRemove([
          '@react-navigation/NavigationState',
          'reduxpersist:auth',
          'reduxpersist:marketplace',
          'reduxpersist:location'
        ]);
        
        console.log('Storage cleared successfully');
      } catch (error) {
        console.warn('Failed to clear storage:', error);
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