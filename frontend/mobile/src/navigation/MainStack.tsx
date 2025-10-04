import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import { ParkingDetailScreen } from '../screens/ParkingDetailScreen';
import { ReservationScreen } from '../screens/ReservationScreen';
import { ListSpotScreen } from '../screens/ListSpotScreen';

const Stack = createStackNavigator();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen
        name="ParkingDetail"
        component={ParkingDetailScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Reservation"
        component={ReservationScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ListSpot"
        component={ListSpotScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};
