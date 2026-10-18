import "./src/i18n";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RideProvider, useRideContext } from './src/context/RideContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { BookingScreen } from './src/screens/BookingScreen';
import { ActiveRideScreen } from './src/screens/ActiveRideScreen';

export const navigationRef = createNavigationContainerRef<any>();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Orange Taxi Rider caught runtime error:", error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>🚕</Text>
          <Text style={errorStyles.title}>Orange Taxi</Text>
          <Text style={errorStyles.subtitle}>
            An unexpected error occurred. Tap below to reload the app cleanly.
          </Text>
          <TouchableOpacity style={errorStyles.button} onPress={this.handleRestart}>
            <Text style={errorStyles.buttonText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D11',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F97316',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#F97316',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

function NavigationSync() {
  const { step } = useRideContext();

  React.useEffect(() => {
    if (!navigationRef.isReady()) return;

    try {
      const currentRoute = navigationRef.getCurrentRoute()?.name;
      if (step === 1 && currentRoute !== 'Home') {
        navigationRef.navigate('Home');
      } else if (step === 2 && currentRoute !== 'Booking') {
        navigationRef.navigate('Booking');
      } else if (step === 4 && currentRoute !== 'ActiveRide') {
        navigationRef.navigate('ActiveRide');
      }
    } catch (err) {
      console.warn("NavigationSync err:", err);
    }
  }, [step]);

  return null;
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <RideProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              if (navigationRef.isReady()) {
                const currentRoute = navigationRef.getCurrentRoute()?.name;
                if (!currentRoute) {
                  navigationRef.navigate('Home');
                }
              }
            }}
          >
            <NavigationSync />
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Booking" component={BookingScreen} />
              <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </RideProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
