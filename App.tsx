import "./src/i18n";

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RideProvider } from './src/context/RideContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { BookingScreen } from './src/screens/BookingScreen';
import { ActiveRideScreen } from './src/screens/ActiveRideScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <RideProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </RideProvider>
    </SafeAreaProvider>
  );
}
