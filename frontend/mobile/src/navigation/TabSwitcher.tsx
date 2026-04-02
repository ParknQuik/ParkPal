import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeDashboard } from '../screens/HomeDashboard';
import { ExploreMap } from '../screens/ExploreMap';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabIcon: React.FC<{ icon: string }> = ({ icon }) => (
  <Text>{icon}</Text>
);

export const TabSwitcher: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10b77f',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: 'white',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeDashboard}
        options={{ tabBarIcon: () => <TabIcon icon="🏠" />, tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreMap}
        options={{ tabBarIcon: () => <TabIcon icon="🗺️" />, tabBarLabel: 'Explore' }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ tabBarIcon: () => <TabIcon icon="📋" />, tabBarLabel: 'Bookings' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: () => <TabIcon icon="👤" />, tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
