import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Alert, AppState, Platform } from 'react-native';

// Configure notification behavior for foreground and background
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Ride updates pushed by the server are for when the app is in the background. While the
      // app is open it already shows its own alert for the same change, so stay quiet.
      const type = (notification.request.content.data as any)?.type;
      if (type === 'ride_update' && AppState.currentState === 'active') {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    },
  });
} catch (err) {
  console.warn("Notifications.setNotificationHandler warning:", err);
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Stay Updated on Your Ride',
          'Enable notifications to receive live arrival alerts when your chauffeur reaches your pickup bay, ride OTP reminders, and in-ride messages.',
          [{ text: 'Continue', onPress: () => resolve() }],
          { cancelable: false }
        );
      });
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions not granted');
      return null;
    }

    // Android channel creation
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orange-taxi-updates', {
        name: 'Orange Taxi Ride Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F97316',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(
      (e) => {
        console.warn('Could not get Expo push token:', e?.message || e);
        return null;
      }
    );
    token = tokenData?.data || null;
  } catch (error) {
    console.warn('Error configuring push notifications:', error);
  }

  return token;
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        color: '#F97316',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // show immediately
    });
  } catch (e) {
    console.warn('Could not schedule local notification:', e);
  }
}
