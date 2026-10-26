import Constants from 'expo-constants';

/**
 * Google Maps web-service key (Directions / Places / Geocoding). EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
 * was never set in eas.json, so release builds silently fell back to straight-line distances.
 * Falls back to the key configured for the Maps SDK in app.json. Set the env var as an EAS
 * secret and restrict both keys in Google Cloud (see the audit report).
 */
export function getGoogleMapsKey(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (fromEnv) return fromEnv;
  const cfg = Constants.expoConfig as any;
  return cfg?.android?.config?.googleMaps?.apiKey || cfg?.ios?.config?.googleMapsApiKey || '';
}

/** Website used for wallet top-ups (Razorpay checkout runs there, settled server-side). */
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://orange-taxi.com';
