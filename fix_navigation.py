with open('App.tsx', 'r') as f:
    content = f.read()

import re

sync_component = """
import { useNavigation } from '@react-navigation/native';
import { useRideContext } from './src/context/RideContext';

function NavigationSync() {
  const { step } = useRideContext();
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    if (step === 1) navigation.navigate('Home');
    if (step === 2) navigation.navigate('Booking');
    if (step === 4) navigation.navigate('ActiveRide');
  }, [step]);

  return null;
}
"""

if "function NavigationSync" not in content:
    content = content.replace("const Stack = createNativeStackNavigator();", sync_component + "\nconst Stack = createNativeStackNavigator();")

    content = content.replace("<Stack.Navigator screenOptions={{ headerShown: false }}>", "<NavigationSync />\n            <Stack.Navigator screenOptions={{ headerShown: false }}>")

with open('App.tsx', 'w') as f:
    f.write(content)
