import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthScreen } from '../screens/AuthScreen';

const Stack = createStackNavigator();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
};
