import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { MapViewScreen } from '../screens/MapViewScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors, typography, spacing } from '../theme';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
          height: 60,
        },
        tabBarLabelStyle: {
          ...typography.small,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapViewScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <MapIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color }) => <BookingsIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Simple icon components (you can replace with actual icon library)
const HomeIcon: React.FC<{ color: string }> = ({ color }) => (
  <Text style={{ fontSize: 24, color }}>🏠</Text>
);

const MapIcon: React.FC<{ color: string }> = ({ color }) => (
  <Text style={{ fontSize: 24, color }}>🗺️</Text>
);

const BookingsIcon: React.FC<{ color: string }> = ({ color }) => (
  <Text style={{ fontSize: 24, color }}>📋</Text>
);

const ProfileIcon: React.FC<{ color: string }> = ({ color }) => (
  <Text style={{ fontSize: 24, color }}>👤</Text>
);
