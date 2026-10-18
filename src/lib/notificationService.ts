import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior for foreground and background
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
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

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
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
