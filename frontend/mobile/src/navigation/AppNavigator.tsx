import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { checkAuth } from '../store/slices/authSlice';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Deep linking configuration for OAuth callbacks
const linking = {
  prefixes: ['parknquik://', 'https://auth.expo.io/@anonymous/parknquik-mobile'],
  config: {
    screens: {
      Auth: 'auth',
      Main: 'main',
    },
  },
};

export const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};
