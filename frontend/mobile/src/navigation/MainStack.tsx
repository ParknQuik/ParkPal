import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TabSwitcher } from './TabSwitcher';
import { ParkingDetails } from '../screens/ParkingDetails';
import { ReserveSpot } from '../screens/ReserveSpot';
import { ListYourSpot } from '../screens/ListYourSpot';
import { QRScannerScreen } from '../screens/QRScannerScreen';
import { QRGeneratorScreen } from '../screens/QRGeneratorScreen';
import { WriteReview } from '../screens/WriteReview';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { BookingConfirmed } from '../screens/BookingConfirmed';
import { PaymentFailedScreen } from '../screens/PaymentFailedScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { MyListingsScreen } from '../screens/MyListingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { MyVehiclesScreen } from '../screens/MyVehiclesScreen';

const Stack = createStackNavigator();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabSwitcher} />
      <Stack.Screen
        name="ParkingDetail"
        component={ParkingDetails}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Reservation"
        component={ReserveSpot}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="QRGenerator"
        component={QRGeneratorScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="ListSpot"
        component={ListYourSpot}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="WriteReview"
        component={WriteReview}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="PaymentSuccess"
        component={BookingConfirmed}
        options={{
          headerShown: false,
          presentation: 'modal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="PaymentFailed"
        component={PaymentFailedScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="MyVehicles"
        component={MyVehiclesScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};
