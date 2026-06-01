import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../store';
import { checkAuth } from '../store/slices/authSlice';
import { loadAnalyticsOptIn, setAnalyticsOptIn } from '../store/slices/analyticsSlice';
import { analyticsAPI } from '../services/api';
import GeofenceService from '../services/analyticsGeofenceService';
import { AnalyticsOptInModal } from '../components/AnalyticsOptInModal';
import { MainStack } from './MainStack';
import { AuthStack } from "./AuthStack";
import { AuthTransitionScreen } from '../components/AuthTransitionScreen';
import { Zone } from '../types';
import { useTheme } from '../context/ThemeContext';

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

const OPT_IN_PROMPTED_KEY = 'analytics_opt_in_prompted';
const AUTH_SUCCESS_TRANSITION_MS = 700;

export const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, checkingAuth, user } = useAppSelector((state) => state.auth);
  const { optedIn } = useAppSelector((state) => state.analytics);
  const { colors, isDark } = useTheme();
  const [showOptIn, setShowOptIn] = useState(false);
  const [hasRequestedInitialAuthCheck, setHasRequestedInitialAuthCheck] = useState(false);
  const [hasResolvedInitialAuthCheck, setHasResolvedInitialAuthCheck] = useState(false);
  const [showAuthTransition, setShowAuthTransition] = useState(false);
  const previousAuthState = useRef(isAuthenticated);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  const darkNavTheme = {
    ...NavigationDarkTheme,
    colors: {
      ...NavigationDarkTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  useEffect(() => {
    dispatch(checkAuth());
    dispatch(loadAnalyticsOptIn());
    setHasRequestedInitialAuthCheck(true);
  }, []);

  useEffect(() => {
    if (!hasRequestedInitialAuthCheck || checkingAuth || hasResolvedInitialAuthCheck) {
      return;
    }

    previousAuthState.current = isAuthenticated;
    setHasResolvedInitialAuthCheck(true);
  }, [
    checkingAuth,
    hasRequestedInitialAuthCheck,
    hasResolvedInitialAuthCheck,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (!hasResolvedInitialAuthCheck || checkingAuth) {
      previousAuthState.current = isAuthenticated;
      return;
    }

    if (!previousAuthState.current && isAuthenticated) {
      setShowAuthTransition(true);
      const timeout = setTimeout(() => {
        setShowAuthTransition(false);
      }, AUTH_SUCCESS_TRANSITION_MS);

      previousAuthState.current = isAuthenticated;
      return () => clearTimeout(timeout);
    }

    previousAuthState.current = isAuthenticated;
  }, [checkingAuth, hasResolvedInitialAuthCheck, isAuthenticated]);

  // When user logs in: check if we've shown the opt-in prompt before
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkOptInPrompt = async () => {
      const prompted = await AsyncStorage.getItem(OPT_IN_PROMPTED_KEY);
      if (!prompted) {
        setShowOptIn(true);
      }
    };
    checkOptInPrompt();
  }, [isAuthenticated]);

  // Start/stop geofence service based on auth + opt-in state
  useEffect(() => {
    if (isAuthenticated && optedIn && user) {
      const startGeofencing = async () => {
        try {
          const res = await analyticsAPI.getZones();
          const zones: Zone[] = (res.data.zones ?? []).map((z: any) => ({
            id: z.id,
            name: z.name,
            geofencePolygon: z.geofencePolygon ?? [],
            centroidLat: z.centroidLat,
            centroidLon: z.centroidLon,
            radiusMeters: z.radiusMeters ?? 300,
          }));
          if (zones.length > 0) {
            await GeofenceService.start(zones, Number(user.id), dispatch);
          }
        } catch {
          // Non-fatal — geofencing is best-effort
        }
      };
      startGeofencing();
    } else {
      GeofenceService.stop();
    }

    return () => {
      GeofenceService.stop();
    };
  }, [isAuthenticated, optedIn, user?.id]);

  const handleOptInAccept = async () => {
    await AsyncStorage.setItem(OPT_IN_PROMPTED_KEY, 'true');
    dispatch(setAnalyticsOptIn(true));
    setShowOptIn(false);
  };

  const handleOptInDecline = async () => {
    await AsyncStorage.setItem(OPT_IN_PROMPTED_KEY, 'true');
    dispatch(setAnalyticsOptIn(false));
    setShowOptIn(false);
  };

  const shouldShowAuthTransition =
    showAuthTransition ||
    (hasResolvedInitialAuthCheck &&
      !checkingAuth &&
      !previousAuthState.current &&
      isAuthenticated);

  if (!hasRequestedInitialAuthCheck || checkingAuth || shouldShowAuthTransition) {
    return <AuthTransitionScreen />;
  }

  return (
    <NavigationContainer linking={linking} theme={isDark ? darkNavTheme : navTheme}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
      <AnalyticsOptInModal
        visible={showOptIn}
        onAccept={handleOptInAccept}
        onDecline={handleOptInDecline}
      />
    </NavigationContainer>
  );
};
