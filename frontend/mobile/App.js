import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './screens/Login';
import MapViewScreen from './screens/MapView';
import Reservation from './screens/Reservation';
import Payment from './screens/Payment';
import Profile from './screens/Profile';
import ListSlot from './screens/ListSlot';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="MapView" component={MapViewScreen} />
        <Stack.Screen name="Reservation" component={Reservation} />
        <Stack.Screen name="Payment" component={Payment} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="ListSlot" component={ListSlot} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
