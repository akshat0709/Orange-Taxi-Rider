import { GuardianContact } from "../components/ProfileModal";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, Platform, StatusBar, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDistanceToPolyline, decodePolyline } from '../lib/geomUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';

import Constants from 'expo-constants';



import { supabase } from '../lib/supabase';
import { VehicleCategory, Booking, Driver, CustomSavedPlace } from '../types';
import { getResolvedVehicleDetails } from '../lib/rideVehicle';
import { haversineMeters } from '../components/RideMap';
import { HourlyPackage } from '../components/HourlyRentalModal';
import { registerForPushNotificationsAsync, sendLocalNotification } from '../lib/notificationService';
import { CabinPreferences, CabinConciergeModal } from '../components/CabinConciergeModal';
import {
  LocationItem,
  getSanitizedLocation,
  EXPANDED_PRESETS,
  getDefaultCityCenter,
  searchPlaces,
  isCoordinateInIndia,
  reverseGeocodeCoordSafe,
  getAirportForCityOrCoords,
} from '../lib/locationService';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatScheduleShort(d: Date): string {
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const dayStr = isToday
    ? 'Today'
    : isTomorrow
    ? 'Tmrw'
    : d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dayStr}, ${timeStr}`;
}

export function formatScheduleDate(d: Date): string {
  return (
    d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

export function getDispatchStatus(scheduledAt: string): { label: string; urgency: 'normal' | 'soon' | 'active' } {
  const now = new Date();
  const pickup = new Date(scheduledAt);
  const diffMins = Math.floor((pickup.getTime() - now.getTime()) / 60000);

  if (diffMins > 30) {
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { label: `Dispatches in ${hrs > 0 ? hrs + 'h ' : ''}${mins}m`, urgency: 'normal' };
  } else if (diffMins > 5) {
    return { label: '🟡 Driver search starting soon', urgency: 'soon' };
  } else if (diffMins >= -5) {
    return { label: '🔴 Driver broadcast active', urgency: 'active' };
  } else {
    return { label: 'Dispatching now...', urgency: 'active' };
  }
}

export const RideContext = createContext<any>(null);

export const useRideContext = () => {
  const context = useContext(RideContext);
  if (!context) throw new Error("useRideContext must be used within a RideProvider");
  return context;
};




export const RideProvider = ({ children }: { children: React.ReactNode }) => {
const insets = useSafeAreaInsets();

const topSafeOffset = Platform.OS === 'android' ? insets.top + 36 : Math.max(insets.top, 54) + 12;

const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

const [user, setUser] = useState<any>(null);

const [authModalVisible, setAuthModalVisible] = useState(false);

const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'verify_otp'>('signin');

const [authEmail, setAuthEmail] = useState('');

const [authPassword, setAuthPassword] = useState('');

const [authConfirmPassword, setAuthConfirmPassword] = useState('');

const [authFullName, setAuthFullName] = useState('');

const [authPhone, setAuthPhone] = useState('');

const [authOtp, setAuthOtp] = useState('');

const [authOtpResendCooldown, setAuthOtpResendCooldown] = useState(0);

const [authOtpLockoutRemaining, setAuthOtpLockoutRemaining] = useState(0);

const [authSubmitting, setAuthSubmitting] = useState(false);

const [vehicles, setVehicles] = useState<VehicleCategory[]>([]);

const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory | null>(null);

const [loading, setLoading] = useState(true);

const [activeCity, setActiveCity] = useState<'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad'>('Bengaluru');

const [cityPickerVisible, setCityPickerVisible] = useState(false);

const [pickupText, setPickupText] = useState('📍 Auto-detecting your location...');

const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9719, lng: 77.5937 });

const [dropLocation, setDropLocation] = useState<LocationItem | null>(null);

const [pickupPillar, setPickupPillar] = useState('');

const [searchModalVisible, setSearchModalVisible] = useState(false);

const [pinPickerActive, setPinPickerActive] = useState(false);

const [pinPickerTarget, setPinPickerTarget] = useState<'pickup' | 'drop'>('drop');

const [pinCurrentCoords, setPinCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6315, lng: 77.2167 });

const [pinAddressText, setPinAddressText] = useState('Detected Pin Location');

const [isBookingPinConfirm, setIsBookingPinConfirm] = useState(false);

const [cabinClimate, setCabinClimate] = useState<'chilled' | 'pleasant' | 'eco'>('chilled');

const [quietRide, setQuietRide] = useState(false);

const [cabinModalVisible, setCabinModalVisible] = useState(false);
const [cabinPreferences, setCabinPreferences] = useState<CabinPreferences>({
  temperature: '21°C',
  music: 'lofi',
  luggageHelp: false,
  noHonking: true,
  screenOn: true,
  waterBottle: true,
});

useEffect(() => {
  AsyncStorage.getItem('@orange_cabin_preferences').then((saved) => {
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCabinPreferences((prev) => ({ ...prev, ...parsed }));
      } catch {}
    }
  }).catch(() => {});
  registerForPushNotificationsAsync().catch(() => {});
}, []);

const updateCabinPreferences = (updated: Partial<CabinPreferences>) => {
  setCabinPreferences((prev) => {
    const next = { ...prev, ...updated };
    AsyncStorage.setItem('@orange_cabin_preferences', JSON.stringify(next)).catch(() => {});
    return next;
  });
};

const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'wallet'>('cash');

const [bookingLoading, setBookingLoading] = useState(false);

const [nearbyDrivers, setNearbyDrivers] = useState<{id: string, lat: number, lng: number}[]>([]);
const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);

const [pendingSearchBooking, setPendingSearchBooking] = useState<Booking | null>(null);

const [chatModalVisible, setChatModalVisible] = useState(false);

const [unreadChatCount, setUnreadChatCount] = useState(0);

const [ratingModalVisible, setRatingModalVisible] = useState(false);

const [profileModalVisible, setProfileModalVisible] = useState(false);

const [guardianModalVisible, setGuardianModalVisible] = useState(false);

const [guardianContact, setGuardianContact] = useState<GuardianContact | null>(null);

const [sosAlertActive, setSosAlertActive] = useState(false);

const [activeTab, setActiveTab] = useState<'home' | 'history' | 'chat' | 'profile'>('home');

const [historyModalVisible, setHistoryModalVisible] = useState(false);

const [amenitiesModalVisible, setAmenitiesModalVisible] = useState(false);

const [walletBalance, setWalletBalance] = useState<number>(0);

const [walletModalVisible, setWalletModalVisible] = useState(false);

const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
const [hourlyModalVisible, setHourlyModalVisible] = useState(false);

const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

  const [routeDeviationModalVisible, setRouteDeviationModalVisible] = useState(false);
  const [expectedPolyline, setExpectedPolyline] = useState<{lat: number, lng: number}[]>([]);
  const [lastDeviationCheck, setLastDeviationCheck] = useState(0);


const [talkToOrangeVisible, setTalkToOrangeVisible] = useState(false);

const [intermediateStop, setIntermediateStop] = useState<LocationItem | null>(null);

const [searchTarget, setSearchTarget] = useState<'pickup' | 'drop' | 'stop'>('drop');
  const [distKm, setDistKm] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);


const [promoInput, setPromoInput] = useState('');

const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; description: string } | null>(null);

const [promoError, setPromoError] = useState<string | null>(null);

const [inAppNotification, setInAppNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'assigned' | 'arrived' | 'started' | 'completed' | 'info';
  } | null>(null);

const [savedHomeAddress, setSavedHomeAddress] = useState('');

const [savedWorkAddress, setSavedWorkAddress] = useState('');

const [hasToll, setHasToll] = useState<boolean>(false);
const [tollFare, setTollFare] = useState<number>(0);
const [tollDetails, setTollDetails] = useState<string>('');

const [customSavedPlaces, setCustomSavedPlaces] = useState<CustomSavedPlace[]>([]);

const [theme, setTheme] = useState<'light' | 'dark'>('light');

useEffect(() => {
    AsyncStorage.getItem('@orange_taxi_theme').then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      }
    }).catch(() => {});
  }, []);

function handleToggleTheme(newTheme?: 'light' | 'dark') {
    Haptics.selectionAsync();
    const nextTheme = newTheme || (theme === 'light' ? 'dark' : 'light');
    setTheme(nextTheme);
    AsyncStorage.setItem('@orange_taxi_theme', nextTheme).catch(() => {});
  }

useEffect(() => {

    // Poll for nearby online drivers every 10 seconds
    const fetchDrivers = async () => {
      try {
        const { data } = await supabase
          .from('drivers')
          .select('id, current_lat, current_lng')
          .eq('is_online', true)
          .not('current_lat', 'is', null);
        if (data) {
          setNearbyDrivers(data.map(d => ({ id: d.id, lat: d.current_lat, lng: d.current_lng })));
        }

        const { data: surgeData } = await supabase.rpc('get_surge_multiplier');
        if (surgeData !== null && surgeData !== undefined) {
          setSurgeMultiplier(Number(surgeData));
        }

      } catch (e) {}
    };
    fetchDrivers();
    const driverPoll = setInterval(fetchDrivers, 10000);

    // Instantly restore cached rider user from storage
    AsyncStorage.getItem('@orange_rider_user').then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id) {
            setUser(parsed);
          }
        } catch {}
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        AsyncStorage.setItem('@orange_rider_user', JSON.stringify(session.user)).catch(() => {});
        await checkActiveRide(session.user.id);
        
        // Restore metadata
        const meta = session.user.user_metadata;
        if (meta?.guardian_contact) {
          setGuardianContact(meta.guardian_contact);
          AsyncStorage.setItem('@orange_guardian_contact', JSON.stringify(meta.guardian_contact));
        }
        if (meta?.home_address) {
          setSavedHomeAddress(meta.home_address);
          AsyncStorage.setItem('@orange_user_home_address', meta.home_address);
        }
        if (meta?.work_address) {
          setSavedWorkAddress(meta.work_address);
          AsyncStorage.setItem('@orange_user_work_address', meta.work_address);
        }
      } else {
        const cached = await AsyncStorage.getItem('@orange_rider_user');
        if (!cached) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        AsyncStorage.setItem('@orange_rider_user', JSON.stringify(session.user)).catch(() => {});
        checkActiveRide(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        AsyncStorage.removeItem('@orange_rider_user').catch(() => {});
      }
    });


    // Request push notifications and save token
    // registerForPushNotificationsAsync().then(async (token) => {
    //   if (token && user) {
    //     try {
    //       await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    //     } catch (e) {
    //       console.log('Push token DB update error', e);
    //     }
    //   }
    // });

    // Load saved guardian contact from local storage
    AsyncStorage.getItem('@orange_guardian_contact').then((stored) => {

    if (user?.id) {
      const fetchWallet = async () => {
        try {
          const { data } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
          if (data?.wallet_balance != null) {
            setWalletBalance(Number(data.wallet_balance));
          }
        } catch (e) {}
      };
      fetchWallet();
    }
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.name && parsed?.phone) {
            setGuardianContact(parsed);
          }
        } catch {}
      }
    });

    // Load saved Home & Work addresses
    AsyncStorage.getItem('@orange_user_home_address').then((stored) => {
      if (stored) setSavedHomeAddress(stored);
    }).catch(() => {});
    AsyncStorage.getItem('@orange_user_work_address').then((stored) => {
      if (stored) setSavedWorkAddress(stored);
    }).catch(() => {});
    AsyncStorage.getItem('@orange_custom_saved_places').then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setCustomSavedPlaces(parsed);
        } catch {}
      }
    }).catch(() => {});

    initApp();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Resend OTP 30-second cooldown timer
  useEffect(() => {
    if (authOtpResendCooldown <= 0) return;
    const interval = setInterval(() => {
      setAuthOtpResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [authOtpResendCooldown]);

  // OTP lockout timer (max 4-5 attempts in 1 min)
  useEffect(() => {
    const checkOtpLockout = async () => {
      try {
        const stored = await AsyncStorage.getItem('@orange_otp_lockout_time');
        if (stored) {
          const diff = Math.ceil((parseInt(stored, 10) - Date.now()) / 1000);
          if (diff > 0) {
            setAuthOtpLockoutRemaining(diff);
          } else {
            setAuthOtpLockoutRemaining(0);
            await AsyncStorage.removeItem('@orange_otp_lockout_time');
          }
        } else {
          setAuthOtpLockoutRemaining(0);
        }
      } catch {}
    };
    checkOtpLockout();
    const interval = setInterval(checkOtpLockout, 1000);
    return () => clearInterval(interval);
  }, []);

useEffect(() => {
    let watcherSub: any = null;

    async function startLiveLocationWatch() {
      try {
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
        let status = existingStatus;
        if (existingStatus !== 'granted') {
          await new Promise<void>((resolve) => {
            Alert.alert(
              'Location Access Required',
              'Orange Taxi uses your location to automatically determine your pickup point, show available electric cabs nearby, and calculate upfront fares.',
              [{ text: 'Continue', onPress: () => resolve() }],
              { cancelable: false }
            );
          });
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }
        if (status === 'granted') {
          watcherSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 4000,
              distanceInterval: 10,
            },
            async (loc) => {
              if (isCoordinateInIndia(loc.coords.latitude, loc.coords.longitude)) {
                setPickupCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                // If on Step 1 and not currently in an active booking, live-resolve their real street address
                if (step === 1 && !activeBooking) {
                  try {
                    const resolved = await reverseGeocodeCoordSafe(loc.coords.latitude, loc.coords.longitude);
                    if (resolved?.displayText) {
                      setPickupText(resolved.displayText);
                      setActiveCity(resolved.cityName);
                    }
                  } catch {}
                }
              } else {
                // Store review testing safeguard: fallback gracefully to Delhi Airport T3 if location is outside India (e.g. Cupertino, CA)
                if (step === 1 && !activeBooking) {
                  setPickupCoords({ lat: 28.5562, lng: 77.1000 });
                  setPickupText('Indira Gandhi International Airport, Terminal 3');
                  setActiveCity('Delhi NCR');
                }
              }
            }
          );
        }
      } catch (e) {}
    }

    startLiveLocationWatch();

    return () => {
      if (watcherSub) watcherSub.remove();
    };
  }, [step, !!activeBooking]);

const bookingStatusRef = useRef(activeBooking?.status);

bookingStatusRef.current = activeBooking?.status;

const pickupCoordsRef = useRef(pickupCoords);

pickupCoordsRef.current = pickupCoords;

const dropLocationRef = useRef(dropLocation);

dropLocationRef.current = dropLocation;

const lastDriverLocRef = useRef<{ lat: number; lng: number } | null>(null);

useEffect(() => {
    const driverId = activeBooking?.driver_id;
    if (!driverId) {
      setAssignedDriver(null);
      lastDriverLocRef.current = null;
      return;
    }

    async function fetchDriver() {
      try {
        const { data } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', driverId)
          .maybeSingle();

        if (data) {
          let hydrated: any = { ...data };
          if (data.vehicle_code && typeof data.vehicle_code === 'string' && data.vehicle_code.startsWith('ORANGE_META:')) {
            try {
              const meta = JSON.parse(data.vehicle_code.replace('ORANGE_META:', ''));
              if (meta.plate && (!hydrated.vehicle_number || hydrated.vehicle_number === 'Unassigned')) {
                hydrated.vehicle_number = meta.plate;
              }
              if (meta.model && !hydrated.vehicle_model) {
                hydrated.vehicle_model = meta.model;
              }
              if (meta.photo && !hydrated.photo_url) {
                hydrated.photo_url = meta.photo;
              }
            } catch (e) {}
          }

          let curLat = data.current_lat != null ? Number(data.current_lat) : null;
          let curLng = data.current_lng != null ? Number(data.current_lng) : null;

          const currentStatus = bookingStatusRef.current;
          const targetCoords = currentStatus === 'in_progress'
            ? dropLocationRef.current
            : pickupCoordsRef.current;

          // If driver has no coordinates yet in DB, initialize ~1.2 km away from pickup
          if ((!curLat || !curLng) && pickupCoordsRef.current?.lat) {
            curLat = pickupCoordsRef.current.lat - 0.009;
            curLng = pickupCoordsRef.current.lng - 0.006;
          }

          if (curLat && curLng && targetCoords?.lat && targetCoords?.lng) {
            // Check if coordinates in DB changed from what was transmitted previously
            const dbStationary = lastDriverLocRef.current &&
              Math.abs(curLat - lastDriverLocRef.current.lat) < 0.00002 &&
              Math.abs(curLng - lastDriverLocRef.current.lng) < 0.00002;

            // Trust the database coordinates for real driver movement
            // No more mock interpolation that overrides the driver's actual GPS!

            lastDriverLocRef.current = { lat: curLat, lng: curLng };
            hydrated.current_lat = curLat;
            hydrated.current_lng = curLng;
          }

          setAssignedDriver((prev: any) => (prev ? { ...prev, ...hydrated } : (hydrated as Driver)));
        }
      } catch (err) {
        console.warn('Driver poll error:', err);
      }
    }

    fetchDriver();

    // 4-second continuous polling cadence matching RideMap's 3.8s 60fps interpolation duration
    const pollInterval = setInterval(fetchDriver, 4000);

    const driverChannel = supabase
      .channel(`driver-loc-${driverId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` },
        (payload: any) => {
          if (payload.new) {
            let updated: any = payload.new;
            if (updated.vehicle_code && typeof updated.vehicle_code === 'string' && updated.vehicle_code.startsWith('ORANGE_META:')) {
              try {
                const meta = JSON.parse(updated.vehicle_code.replace('ORANGE_META:', ''));
                if (meta.plate && (!updated.vehicle_number || updated.vehicle_number === 'Unassigned')) {
                  updated.vehicle_number = meta.plate;
                }
                if (meta.model && !updated.vehicle_model) {
                  updated.vehicle_model = meta.model;
                }
                if (meta.photo && !updated.photo_url) {
                  updated.photo_url = meta.photo;
                }
              } catch (e) {}
            }
            if (updated.current_lat && updated.current_lng) {
              lastDriverLocRef.current = { lat: Number(updated.current_lat), lng: Number(updated.current_lng) };
            }
            setAssignedDriver((prev: any) => (prev ? { ...prev, ...updated } : updated));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(driverChannel);
    };
  }, [activeBooking?.driver_id]);

async function checkActiveRide(userId?: string) {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .in('status', ['searching', 'scheduled', 'accepted', 'arrived', 'in_progress'])
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('customer_id', userId);
      } else {
        const stored = await AsyncStorage.getItem('@orange_booking_history_ids');
        const idList: string[] = stored ? JSON.parse(stored) : [];
        if (Array.isArray(idList) && idList.length > 0) {
          query = query.in('id', idList);
        } else {
          return;
        }
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (!error && data) {
        if (data.status === 'searching') {
          // Show a "Resume Booking" banner on the home screen — don't auto-jump
          setPendingSearchBooking(data as Booking);
        } else if (data.status === 'scheduled') {
          // Store scheduled booking to show banner on home screen, stay on step 1
          setActiveBooking(data as Booking);
        } else {
          // Actively assigned/in-progress — jump straight to the ride screen
          setActiveBooking(data as Booking);
          setStep(4);
        }
      }
    } catch (e) {
      console.warn('Check active ride notice:', e);
    }
  }

async function initApp() {
    try {
      // 1. Single vehicle category (Orange Signature)
      const defaults: VehicleCategory[] = [
        { id: '1', code: 'ORANGE_SIGNATURE', name: 'Orange Signature', tagline: 'Spotless, Pre-Cooled 100% Electric EV', seats: 4, base_fare: 99, per_km: 18, minimum_fare: 149, sort_order: 1 }
      ];
      setVehicles(defaults);
      setSelectedVehicle(defaults[0]);

      // 2. Acquire sanitized location
      await refreshLocation(activeCity);
    } catch (e) {
      console.warn('Init error:', e);
    } finally {
      }
  }

async function refreshLocation(fallback: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad') {
    const locResult = await getSanitizedLocation(fallback);
    setPickupCoords({ lat: locResult.lat, lng: locResult.lng });
    setPickupText(locResult.displayText);
    setActiveCity(locResult.cityName);
  }

function handleSelectCity(city: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad') {
    Haptics.selectionAsync();
    setActiveCity(city);
    setCityPickerVisible(false);

    const defaultHub = getDefaultCityCenter(city, false);
    setPickupCoords({ lat: defaultHub.lat, lng: defaultHub.lng });
    setPickupText(defaultHub.displayText);
    setDropLocation(null);
  }

async function handleHomeMapPress(coords: { lat: number; lng: number }) {
    if (step !== 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickupCoords(coords);
    try {
      const resolved = await reverseGeocodeCoordSafe(coords.lat, coords.lng);
      if (resolved?.displayText) {
        setPickupText(resolved.displayText);
        setActiveCity(resolved.cityName);
      } else {
        setPickupText(`Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      }
    } catch (e) {
      setPickupText(`Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    }
  }

const rawDist = distKm;

const baseFare = selectedVehicle?.base_fare || 99;

const perKm = selectedVehicle?.per_km || 18;

const minFare = selectedVehicle?.minimum_fare || 149;

const distanceFare = Math.round(perKm * distKm);

const stopFare = intermediateStop ? 35 : 0;

const preTax = Math.max(minFare, baseFare + distanceFare + stopFare + tollFare);

const taxAmount = Math.round(preTax * 0.05);

const platformFee = 0;

const calculatedPreDiscount = preTax + taxAmount + platformFee;

const discountAmount = appliedPromo ? Math.min(appliedPromo.discount, calculatedPreDiscount - minFare) : 0;

const totalEstimatedFare = Math.max(minFare, calculatedPreDiscount - discountAmount);

const PROMO_CODES: Record<string, { discountType: 'flat' | 'percent'; value: number; minFare: number; desc: string }> = {
    'FIRST100': { discountType: 'flat', value: 100, minFare: 180, desc: '₹100 welcome bonus on Orange fleet' },
  };

  useEffect(() => {
    if (pickupCoords.lat && dropLocation?.lat) {
      const fetchDistance = async () => {
        try {
          const origin = `${pickupCoords.lat},${pickupCoords.lng}`;
          const dest = `${dropLocation.lat},${dropLocation.lng}`;
          const API_KEY = "AIzaSyD-IOH9cMppWtKjw_zn-m7XOE3ut62HVX8";
          
          // Google Directions API for exact route distance, duration and toll detection
          const dirRes = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${API_KEY}`);
          const dirJson = await dirRes.json();

          if (dirJson.status === 'OK' && dirJson.routes && dirJson.routes.length > 0) {
            const route = dirJson.routes[0];
            const leg = route.legs?.[0];
            const meters = leg ? leg.distance.value : 0;
            const seconds = leg ? leg.duration.value : 0;
            setDistKm(meters / 1000);
            setDurationMin(Math.round(seconds / 60));

            const warningsStr = (route.warnings || []).join(' ').toLowerCase();
            const summaryStr = (route.summary || '').toLowerCase();
            const dropStr = ((dropLocation.name || '') + ' ' + (dropLocation.subtitle || '')).toLowerCase();
            const pickStr = (pickupText || '').toLowerCase();

            const isAirport = dropStr.includes('airport') || dropStr.includes('kempegowda') || dropStr.includes('kia') || pickStr.includes('airport') || pickStr.includes('kempegowda') || pickStr.includes('kia');
            const isNiceRoad = summaryStr.includes('nice') || warningsStr.includes('nice') || dropStr.includes('nice') || pickStr.includes('nice');
            const hasTollWarning = warningsStr.includes('toll') || isAirport || isNiceRoad;

            if (hasTollWarning) {
              setHasToll(true);
              const tollAmt = isAirport ? 115 : isNiceRoad ? 95 : 110;
              setTollFare(tollAmt);
              setTollDetails(isAirport ? 'Airport Expressway Toll Included' : 'Highway / Expressway Toll Included');
            } else {
              setHasToll(false);
              setTollFare(0);
              setTollDetails('');
            }
          } else {
            const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&key=${API_KEY}`);
            const json = await res.json();
            if (json.rows?.[0]?.elements?.[0]?.status === 'OK') {
              const meters = json.rows[0].elements[0].distance.value;
              const seconds = json.rows[0].elements[0].duration.value;
              setDistKm(meters / 1000);
              setDurationMin(Math.round(seconds / 60));
            } else {
              const hDist = haversineMeters(pickupCoords.lat, pickupCoords.lng, dropLocation.lat, dropLocation.lng);
              setDistKm(Math.max(1, (hDist / 1000) * 1.4));
              setDurationMin(Math.max(3, Math.round((hDist / 1000) * 1.4 / 0.4)));
            }
            setHasToll(false);
            setTollFare(0);
            setTollDetails('');
          }
        } catch (e) {
          const hDist = haversineMeters(pickupCoords.lat, pickupCoords.lng, dropLocation.lat, dropLocation.lng);
          setDistKm(Math.max(1, (hDist / 1000) * 1.4));
          setDurationMin(Math.max(3, Math.round((hDist / 1000) * 1.4 / 0.4)));
          setHasToll(false);
          setTollFare(0);
          setTollDetails('');
        }
      };
      fetchDistance();
    } else {
      setDistKm(0);
      setDurationMin(0);
      setHasToll(false);
      setTollFare(0);
      setTollDetails('');
    }
  }, [pickupCoords.lat, pickupCoords.lng, dropLocation?.lat, dropLocation?.lng]);

async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a promo code');
      return;
    }
    const promo = PROMO_CODES[code];
    if (!promo) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPromoError('Invalid code. Try FIRST100.');
      return;
    }
    
    if (code === 'FIRST100') {
      const used = await AsyncStorage.getItem(`@orange_promo_used_FIRST100_${user?.id || 'guest'}`);
      if (used) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPromoError('You have already used the FIRST100 welcome bonus.');
        return;
      }
    }
    if (calculatedPreDiscount < promo.minFare) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPromoError(`Minimum ride fare of ₹${promo.minFare} required for ${code}.`);
      return;
    }
    let disc = 0;
    if (promo.discountType === 'flat') {
      disc = promo.value;
    } else {
      disc = Math.min(150, Math.round((calculatedPreDiscount * promo.value) / 100));
    }
    setAppliedPromo({ code, discount: disc, description: promo.desc });
    setPromoError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

const currentResumableBooking =
    pendingSearchBooking ||
    (step === 1 && activeBooking && ['searching', 'accepted', 'arrived', 'in_progress'].includes(activeBooking.status)
      ? activeBooking
      : null);

const activeScheduledBooking =
    step === 1 && activeBooking && activeBooking.status === 'scheduled'
      ? activeBooking
      : null;

const rateNowBooking =
    step === 1 && activeBooking?.status === 'completed' && !activeBooking?.rating
      ? activeBooking
      : null;

const [dispatchStatus, setDispatchStatus] = useState<{ label: string; urgency: 'normal' | 'soon' | 'active' } | null>(null);

useEffect(() => {
    if (!activeBooking?.scheduled_at || activeBooking.status !== 'scheduled') {
      setDispatchStatus(null);
      return;
    }
    const update = () => setDispatchStatus(getDispatchStatus(activeBooking.scheduled_at!));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [activeBooking?.scheduled_at, activeBooking?.status]);

useEffect(() => {
    const targetBookingId = activeBooking?.id || pendingSearchBooking?.id;
    if (!targetBookingId) return;

    function applyBookingUpdate(newBooking: any) {
      if (!newBooking) return;
      
      // If the booking was cancelled (by user or driver), completely clear it
      if (newBooking.status === 'cancelled') {
        setActiveBooking(null);
        setPendingSearchBooking(null);
        setAssignedDriver(null);
        setStep(1);
        return;
      }

      // If driver accepted, it's now an active booking, so clear pending
      if (['accepted', 'arrived', 'in_progress'].includes(newBooking.status)) {
         setPendingSearchBooking(null);
      }

      setActiveBooking((prev) => {
        if (!prev) return newBooking;
        const statusChanged = prev.status !== newBooking.status;
        const driverChanged = prev.driver_id !== newBooking.driver_id;
        const vehicleChanged =
          prev.vehicle_name !== newBooking.vehicle_name ||
          prev.vehicle_number !== newBooking.vehicle_number;
        const otpChanged = prev.ride_otp !== newBooking.ride_otp;

        if (statusChanged || driverChanged || vehicleChanged || otpChanged) {
          if (statusChanged) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            let notifTitle = '';
            let notifMsg = '';
            let notifType: 'assigned' | 'arrived' | 'started' | 'completed' | 'info' = 'info';

            if (newBooking.status === 'accepted') {
              notifTitle = '🚗 Chauffeur Assigned!';
              notifMsg = `${newBooking.driver_name || 'Your chauffeur'} is on the way in a Mahindra BE.6 (${newBooking.vehicle_number || 'EV'})`;
              notifType = 'assigned';
            } else if (newBooking.status === 'arrived') {
              notifTitle = '📍 Chauffeur Arrived!';
              notifMsg = `Chauffeur has reached pickup bay. Share OTP ${newBooking.ride_otp || ''} to begin.`;
              notifType = 'arrived';
            } else if (newBooking.status === 'in_progress') {
              notifTitle = '🌿 Quiet Luxury Ride Started';
              notifMsg = 'Pre-cooled AC active at 22°C. Enjoy the quiet EV commute!';
              notifType = 'started';
            } else if (newBooking.status === 'completed') {
              notifTitle = '🎉 Arrived at Destination';
              notifMsg = `Trip completed. Fare: ₹${newBooking.estimated_fare || ''}. Tax invoice generated.`;
              notifType = 'completed';
            } else if (newBooking.status === 'cancelled') {
              notifTitle = '❌ Ride Request Cancelled';
              notifMsg = 'Your booking has been cancelled. Tap to request a new ride.';
              notifType = 'info';
            }

            if (notifTitle) {
              setInAppNotification({
                id: `notif-${Date.now()}`,
                title: notifTitle,
                message: notifMsg,
                type: notifType,
              });
              setTimeout(() => setInAppNotification(null), 6000);
              sendLocalNotification(notifTitle, notifMsg, { bookingId: newBooking.id, status: newBooking.status });
            }
          }

          if (newBooking.status === 'completed' && prev.status !== 'completed' && !newBooking.rating) {
            setTimeout(() => setRatingModalVisible(true), 2000);
          }
          return { ...prev, ...newBooking };
        }
        return prev;
      });
    }

    const channel = supabase
      .channel(`booking-auto-${targetBookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${targetBookingId}` },
        (payload: any) => {
          if (payload.new) {
            applyBookingUpdate(payload.new);
          }
        }
      )
      .subscribe();

    const pollTimer = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', targetBookingId)
          .maybeSingle();

        if (data) {
          applyBookingUpdate(data);
        }
      } catch (e) {}
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [activeBooking?.id, pendingSearchBooking?.id]);

async function handlePinRegionChange(coords: { lat: number; lng: number }) {
    setPinCurrentCoords(coords);
    try {
      const resolved = await reverseGeocodeCoordSafe(coords.lat, coords.lng);
      if (resolved?.displayText) {
        setPinAddressText(resolved.displayText);
      } else {
        setPinAddressText(`Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      }
    } catch (e) {
      setPinAddressText(`Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    }
  }

function handleConfirmPinPicker() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isBookingPinConfirm) {
      setPinPickerActive(false);
      setIsBookingPinConfirm(false);
      setPickupCoords(pinCurrentCoords);
      setPickupText(pinAddressText);
      executeBookingSubmission(pinCurrentCoords, pinAddressText);
      return;
    }

    if (pinPickerTarget === 'pickup') {
      setPickupCoords(pinCurrentCoords);
      setPickupText(pinAddressText);
      setPinPickerActive(false);
      if (dropLocation) {
        setStep(2); // Return smoothly to booking screen with updated pickup
      }
    } else {
      setDropLocation({
        id: `custom-pin-${Date.now()}`,
        name: pinAddressText,
        subtitle: 'Selected from map',
        city: activeCity,
        lat: pinCurrentCoords.lat,
        lng: pinCurrentCoords.lng,
        tag: '📍 Custom Pin',
      });
      setPinPickerActive(false);
      setStep(2); // Proceed to ride selection
    }
  }

async function handleConfirmBooking() {
    if (!user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setAuthMode('signin');
      setAuthModalVisible(true);
      return;
    }

    if (!dropLocation) {
      Alert.alert('Destination Required', 'Please select your drop-off destination before confirming.');
      setSearchModalVisible(true);
      return;
    }

    if (paymentMethod === 'wallet' && walletBalance < totalEstimatedFare) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `Your estimated fare is ₹${totalEstimatedFare}, but your wallet balance is only ₹${walletBalance}. Please add funds or select a different payment method.`
      );
      setWalletModalVisible(true);
      return;
    }

    // Direct booking execution with selected pickup & drop locations
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await executeBookingSubmission(pickupCoords, pickupText);
  }

async function executeBookingSubmission(finalCoords?: { lat: number; lng: number }, finalAddress?: string) {
    if (!user || !dropLocation) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBookingLoading(true);

    const effectiveCoords = finalCoords || pickupCoords;
    const effectiveAddress = finalAddress || pickupText;
    const effectivePickup = pickupPillar ? `${effectiveAddress} (${pickupPillar})` : effectiveAddress;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const ref = 'OT' + Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const isAdvanceBooking = Boolean(scheduledDate);
      const scheduledIso = scheduledDate ? scheduledDate.toISOString() : null;
      const scheduledFormatted = scheduledDate ? formatScheduleDate(scheduledDate) : '';

      const effectiveDropArea = intermediateStop
        ? `Via ${intermediateStop.name} ➔ ${dropLocation.name}`
        : dropLocation.name;
      const effectiveDropAddress = intermediateStop
        ? `${intermediateStop.lat},${intermediateStop.lng} | ${dropLocation.lat},${dropLocation.lng}`
        : `${dropLocation.lat},${dropLocation.lng}`;

      const bookingPayload: any = {
        customer_id: user.id,
        reference: ref,
        pickup_area: effectivePickup,
        pickup_address: `${effectiveCoords.lat},${effectiveCoords.lng} | CABIN:${JSON.stringify(cabinPreferences)}`,
        drop_area: effectiveDropArea,
        drop_address: effectiveDropAddress,
        distance_km: distKm,
        duration_min: durationMin,
        vehicle_code: selectedVehicle?.code || 'ORANGE_SIGNATURE',
        vehicle_name: selectedVehicle?.name || 'Orange Signature',
        base_fare: baseFare,
        distance_fare: distanceFare,
        tax_amount: taxAmount,
        estimated_fare: totalEstimatedFare,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'wallet' ? 'paid' : 'pending',
        payment_made: paymentMethod === 'wallet' ? 'yes' : 'no',
        ride_otp: otp,
        status: isAdvanceBooking ? 'scheduled' : 'searching',
        scheduled_at: scheduledIso,
      };

      let { data, error } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select('*')
        .single();

      if (error && error.message && error.message.includes('payment_made')) {
        const safePayload = { ...bookingPayload };
        delete safePayload.payment_made;
        const retry = await supabase.from('bookings').insert(safePayload).select('*').single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('DB insert error:', error);
        Alert.alert('Booking Notice', error.message || 'Unable to confirm booking. Please try again.');
        return;
      }

      if (data?.id) {
        try {
          const stored = await AsyncStorage.getItem('@orange_booking_history_ids');
          const idList: string[] = stored ? JSON.parse(stored) : [];
          if (!idList.includes(data.id)) {
            idList.unshift(data.id);
            await AsyncStorage.setItem('@orange_booking_history_ids', JSON.stringify(idList.slice(0, 50)));
          }
        } catch (e) {
          console.warn('Could not cache booking id in AsyncStorage:', e);
        }
      }

      setPinPickerActive(false);
      setIsBookingPinConfirm(false);

      if (isAdvanceBooking) {
        setActiveBooking(data as Booking);
        setScheduledDate(null);
        setDropLocation(null);
        setStep(1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Alert.alert(
          'Ride Scheduled Successfully! 🍊',
          `Your advance ride is confirmed for ${scheduledFormatted}.\n\n• Zero-Surge Fare Locked: ₹${totalEstimatedFare}\n• Chauffeur broadcast starts 15–30 mins before departure\n• Pre-cooled AC at 22°C & sealed mineral water\n\nYou can view your scheduled ride on the Home screen or in Ride History.`,
          [
            {
              text: 'View in Ride History',
              onPress: () => {
                setHistoryModalVisible(true);
              },
            },
            { text: 'Done', style: 'default' },
          ]
        );
        return;
      }

      setActiveBooking(data as Booking);
      setScheduledDate(null);
      setStep(4);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Booking Notice', err.message || 'Connecting to fleet...');
    } finally {
      setBookingLoading(false);
    }
  }

  async function handleConfirmHourlyRental(pkg: HourlyPackage) {
    if (!user) {
      setHourlyModalVisible(false);
      setAuthMode('signin');
      setAuthModalVisible(true);
      return;
    }

    if (paymentMethod === 'wallet' && walletBalance < pkg.orangePrice) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `Your hourly rental fare is ₹${pkg.orangePrice}, but your wallet balance is only ₹${walletBalance}. Please add funds or choose Cash/Card.`
      );
      setWalletModalVisible(true);
      return;
    }

    setBookingLoading(true);
    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const ref = 'OT' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const dropTitle = `Hourly Rental · ${pkg.hours} Hours (${pkg.distanceKm} km)`;

      const hourlyPayload: any = {
        customer_id: user.id,
        reference: ref,
        pickup_area: pickupText || 'Current Location',
        pickup_address: `${pickupCoords.lat},${pickupCoords.lng} | CABIN:${JSON.stringify(cabinPreferences)}`,
        drop_area: dropTitle,
        drop_address: `${pickupCoords.lat},${pickupCoords.lng}`,
        distance_km: pkg.distanceKm,
        duration_min: pkg.hours * 60,
        vehicle_code: 'ORANGE_SIGNATURE',
        vehicle_name: `Orange Signature (${pkg.hours}h Rental)`,
        base_fare: pkg.orangePrice,
        distance_fare: 0,
        tax_amount: 0,
        estimated_fare: pkg.orangePrice,
        payment_method: paymentMethod || 'cash',
        payment_status: paymentMethod === 'wallet' ? 'paid' : 'pending',
        payment_made: paymentMethod === 'wallet' ? 'yes' : 'no',
        ride_otp: otp,
        status: 'searching',
      };

      let { data, error } = await supabase
        .from('bookings')
        .insert(hourlyPayload)
        .select('*')
        .single();

      if (error && error.message && error.message.includes('payment_made')) {
        const safePayload = { ...hourlyPayload };
        delete safePayload.payment_made;
        const retry = await supabase.from('bookings').insert(safePayload).select('*').single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Hourly booking insert error:', error);
        Alert.alert('Booking Notice', error.message || 'Unable to confirm hourly rental. Please try again.');
        return;
      }

      if (data?.id) {
        try {
          const stored = await AsyncStorage.getItem('@orange_booking_history_ids');
          const idList: string[] = stored ? JSON.parse(stored) : [];
          if (!idList.includes(data.id)) {
            idList.unshift(data.id);
            await AsyncStorage.setItem('@orange_booking_history_ids', JSON.stringify(idList.slice(0, 50)));
          }
        } catch (e) {
          console.warn('Could not cache hourly booking id:', e);
        }
      }

      setHourlyModalVisible(false);
      setActiveBooking(data as Booking);
      setStep(4);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Booking Notice', err.message || 'Connecting to fleet...');
    } finally {
      setBookingLoading(false);
    }
  }

async function handleQuickHome() {
    Haptics.selectionAsync();
    if (!savedHomeAddress || !savedHomeAddress.trim()) {
      Alert.alert(
        'Home Address Not Set',
        'Add your home address in your profile to enable 1-tap quick rides to home.',
        [
          { text: 'Set in Profile', onPress: () => setProfileModalVisible(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      const savedCoords = await AsyncStorage.getItem('@orange_user_home_coords');
      if (savedCoords) {
        const parsed = JSON.parse(savedCoords);
        if (parsed.lat && parsed.lng) {
          setDropLocation({
            id: 'home_saved',
            name: savedHomeAddress,
            subtitle: 'Saved Home Location',
            city: (activeCity as any) || 'Bengaluru',
            lat: parsed.lat,
            lng: parsed.lng,
          });
          setStep(2);
          return;
        }
      }
    } catch (e) {}

    const matches = await searchPlaces(savedHomeAddress, activeCity, pickupCoords);
    if (matches.length > 0) {
      setDropLocation(matches[0]);
    } else {
      setDropLocation({
        id: 'home_' + Date.now(),
        name: savedHomeAddress,
        subtitle: 'Saved Home Address',
        city: (activeCity as any) || 'Bengaluru',
        lat: pickupCoords.lat + 0.04,
        lng: pickupCoords.lng + 0.04,
      });
    }
    setStep(2);
  }

async function handleQuickWork() {
    Haptics.selectionAsync();
    if (!savedWorkAddress || !savedWorkAddress.trim()) {
      Alert.alert(
        'Work Address Not Set',
        'Add your workplace or tech park in your profile to enable 1-tap quick rides to work.',
        [
          { text: 'Set in Profile', onPress: () => setProfileModalVisible(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      const savedCoords = await AsyncStorage.getItem('@orange_user_work_coords');
      if (savedCoords) {
        const parsed = JSON.parse(savedCoords);
        if (parsed.lat && parsed.lng) {
          setDropLocation({
            id: 'work_saved',
            name: savedWorkAddress,
            subtitle: 'Saved Work Location',
            city: (activeCity as any) || 'Bengaluru',
            lat: parsed.lat,
            lng: parsed.lng,
          });
          setStep(2);
          return;
        }
      }
    } catch (e) {}

    const matches = await searchPlaces(savedWorkAddress, activeCity, pickupCoords);
    if (matches.length > 0) {
      setDropLocation(matches[0]);
    } else {
      setDropLocation({
        id: 'work_' + Date.now(),
        name: savedWorkAddress,
        subtitle: 'Saved Work Address',
        city: (activeCity as any) || 'Bengaluru',
        lat: pickupCoords.lat + 0.05,
        lng: pickupCoords.lng + 0.05,
      });
    }
    setStep(2);
  }

async function handleQuickAirport() {
    Haptics.selectionAsync();
    const airport = getAirportForCityOrCoords(activeCity, pickupCoords);
    if (airport) {
      setDropLocation(airport);
      setStep(2);
    } else {
      setSearchTarget('drop');
      setSearchModalVisible(true);
    }
  }

  async function saveCustomPlace(place: { label: string; address: string; lat: number; lng: number }) {
    const newPlace: CustomSavedPlace = {
      ...place,
      id: 'place_' + Date.now(),
    };
    const updated = [...customSavedPlaces, newPlace];
    setCustomSavedPlaces(updated);
    await AsyncStorage.setItem('@orange_custom_saved_places', JSON.stringify(updated));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function deleteCustomPlace(id: string) {
    const updated = customSavedPlaces.filter((p) => p.id !== id);
    setCustomSavedPlaces(updated);
    await AsyncStorage.setItem('@orange_custom_saved_places', JSON.stringify(updated));
    Haptics.selectionAsync();
  }

  function handleQuickCustomPlace(place: CustomSavedPlace) {
    Haptics.selectionAsync();
    setDropLocation({
      id: place.id,
      name: place.label,
      subtitle: place.address,
      city: (activeCity as any) || 'Bengaluru',
      lat: place.lat,
      lng: place.lng,
    });
    setStep(2);
  }

function handleRepeatTrip(trip: any) {
    setHistoryModalVisible(false);
    setActiveTab('home');
    
    if (trip.pickup_area && trip.pickup_address) {
      setPickupText(trip.pickup_area);
      const [plat, plng] = trip.pickup_address.split('|')[0].trim().split(',').map(Number);
      if (!isNaN(plat) && !isNaN(plng)) {
        setPickupCoords({ lat: plat, lng: plng });
      }
    }
    
    if (trip.drop_area && trip.drop_address) {
      const [dlat, dlng] = trip.drop_address.split(',').map(Number);
      if (!isNaN(dlat) && !isNaN(dlng)) {
        setDropLocation({
          id: 'repeat_' + Date.now(),
          name: trip.drop_area,
          subtitle: 'Past Trip Destination',
          city: 'Other',
          lat: dlat,
          lng: dlng,
        });
      }
    }
    setStep(2);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

async function handleCancelRide() {
    if (!activeBooking) return;

    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride? There is no cancellation fee.', [
      { text: 'Keep Ride', style: 'cancel' },
      {
        text: 'Cancel Ride',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', activeBooking.id);

          setActiveBooking(null);
          setPendingSearchBooking(null);
          setAssignedDriver(null);
          setStep(1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

async function handleForgotPassword() {
    if (!authEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
        redirectTo: 'https://orange-taxi.com/login?mode=reset',
      });
      if (error) throw error;
      Alert.alert('Reset Email Sent', 'Please check your email inbox for password reset instructions.');
    } catch (e: any) {
      Alert.alert('Reset Failed', e.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

async function handleAuthSubmit() {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Required Fields', 'Please enter both your email and password.');
      return;
    }

    setAuthSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (authMode === 'signin') {
        const storedLockout = await AsyncStorage.getItem('@orange_lockout_time');
        if (storedLockout && parseInt(storedLockout) > Date.now()) {
          const remainingSeconds = Math.ceil((parseInt(storedLockout) - Date.now()) / 1000);
          Alert.alert('Account Locked', `Too many failed attempts. Please try again in ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}.`);
          setAuthSubmitting(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        
        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setAuthMode('verify_otp');
            setAuthOtp('');
            setAuthOtpResendCooldown(30);
            supabase.auth.resend({
              type: 'signup',
              email: authEmail.trim(),
            }).catch(() => {});
            Alert.alert(
              'Email Verification Required',
              `Please verify your email address to continue. A verification code has been sent to ${authEmail.trim()}. You can also tap the confirmation link in your email.`
            );
            setAuthSubmitting(false);
            return;
          }

          const storedAttempts = await AsyncStorage.getItem('@orange_login_attempts');
          let attempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;
          attempts++;
          
          if (attempts >= 5) {
            await AsyncStorage.setItem('@orange_lockout_time', (Date.now() + 60 * 1000).toString());
            await AsyncStorage.setItem('@orange_login_attempts', '0');
            Alert.alert('Account Locked', '5 unsuccessful attempts. Please wait 1 minute before trying again.');
          } else {
            await AsyncStorage.setItem('@orange_login_attempts', attempts.toString());
            Alert.alert('Login Failed', `Incorrect credentials. ${5 - attempts} attempt${5 - attempts === 1 ? '' : 's'} remaining.`);
          }
          throw error;
        }
        
        await AsyncStorage.setItem('@orange_login_attempts', '0');
        await AsyncStorage.removeItem('@orange_lockout_time');
        
        setUser(data.user);
        await AsyncStorage.setItem('@orange_rider_user', JSON.stringify(data.user));
        setAuthModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        if (!authFullName.trim() || !authPhone.trim()) {
          Alert.alert('Required Fields', 'Please enter your Full Name and Phone number.');
          setAuthSubmitting(false);
          return;
        }

        if (authPassword.length < 8) {
          Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
          setAuthSubmitting(false);
          return;
        }

        if (authPassword !== authConfirmPassword) {
          Alert.alert('Passwords Do Not Match', 'Please ensure both password fields match.');
          setAuthSubmitting(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword.trim(),
          options: {
            data: {
              full_name: authFullName.trim(),
              phone: authPhone.trim(),
              role: 'customer',
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: authFullName.trim(),
              phone: authPhone.trim(),
              updated_at: new Date().toISOString(),
            });
          } catch {}
        }

        if (data.user && !data.session) {
          setAuthMode('verify_otp');
          setAuthOtp('');
          setAuthOtpResendCooldown(30);
          Alert.alert(
            'Verification Code Sent',
            `A 6-digit verification code has been sent to ${authEmail.trim()}. Please enter it to complete registration, or tap the link in your email.`
          );
          setAuthSubmitting(false);
          return;
        }

        setUser(data.user);
        await AsyncStorage.setItem('@orange_rider_user', JSON.stringify(data.user));
        setAuthModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Please check your details.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    if (authOtpLockoutRemaining > 0) {
      Alert.alert('Verification Locked', `Too many failed attempts. Please wait ${authOtpLockoutRemaining} second${authOtpLockoutRemaining === 1 ? '' : 's'}.`);
      return;
    }
    const cleanOtp = authOtp.trim();
    if (cleanOtp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setAuthSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: authEmail.trim(),
        token: cleanOtp,
        type: 'signup',
      });

      if (error) {
        const retry = await supabase.auth.verifyOtp({
          email: authEmail.trim(),
          token: cleanOtp,
          type: 'email',
        });
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      }

      if (error) {
        const storedAttempts = await AsyncStorage.getItem('@orange_otp_attempts');
        let attempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;
        attempts++;
        if (attempts >= 5) {
          await AsyncStorage.setItem('@orange_otp_lockout_time', (Date.now() + 60 * 1000).toString());
          await AsyncStorage.setItem('@orange_otp_attempts', '0');
          setAuthOtpLockoutRemaining(60);
          Alert.alert('Verification Locked', '5 unsuccessful attempts. Please wait 1 minute before trying again.');
        } else {
          await AsyncStorage.setItem('@orange_otp_attempts', attempts.toString());
          Alert.alert('Verification Failed', `${error.message} (${5 - attempts} attempt${5 - attempts === 1 ? '' : 's'} remaining).`);
        }
        throw error;
      }

      await AsyncStorage.setItem('@orange_otp_attempts', '0');
      await AsyncStorage.removeItem('@orange_otp_lockout_time');

      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem('@orange_rider_user', JSON.stringify(data.user));
      }
      setAuthModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Email verified successfully! Welcome to Orange Taxi.');
    } catch (err: any) {
      // Handled in alert
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (authOtpResendCooldown > 0 || !authEmail.trim()) return;
    setAuthSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let { error } = await supabase.auth.resend({
        type: 'signup',
        email: authEmail.trim(),
      });
      if (error) {
        const retry = await supabase.auth.resend({
          type: 'email_change',
          email: authEmail.trim(),
        });
        if (!retry.error) error = null;
      }
      if (error) {
        if (error.status === 429 || error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('too many requests')) {
          setAuthOtpLockoutRemaining(60);
          Alert.alert('Rate Limited', 'Too many requests. Please wait 60 seconds before trying again.');
        } else {
          Alert.alert('Resend Failed', error.message);
        }
        return;
      }
      setAuthOtpResendCooldown(30);
      Alert.alert('Code Sent', 'A fresh 6-digit verification code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Resend Error', err.message || 'Failed to resend code.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('@orange_rider_user');
    setUser(null);
    setActiveBooking(null);
    setAssignedDriver(null);
    setStep(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }


  useEffect(() => {
    if (activeBooking?.status === 'in_progress' && expectedPolyline.length === 0 && activeBooking.pickup_address && activeBooking.drop_address) {
      const pick = activeBooking.pickup_address.split('|')[0].trim().split(',').map(Number);
      let dropStr = activeBooking.drop_address;
      if (dropStr.includes('|')) dropStr = dropStr.split('|')[1].trim();
      const drop = dropStr.split(',').map(Number);
      
      if (pick.length >= 2 && drop.length >= 2 && !isNaN(pick[0]) && !isNaN(drop[0])) {
        const fetchPolyline = async () => {
          try {
            const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pick[0]},${pick[1]}&destination=${drop[0]},${drop[1]}&key=${GOOGLE_API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
               const points = decodePolyline(data.routes[0].overview_polyline.points);
               setExpectedPolyline(points);
            }
          } catch(e) {}
        };
        fetchPolyline();
      }
    }
  }, [activeBooking?.status, activeBooking?.pickup_address, activeBooking?.drop_address, expectedPolyline.length]);

  useEffect(() => {
    if (activeBooking?.status === 'in_progress' && expectedPolyline.length > 0 && assignedDriver?.current_lat && assignedDriver?.current_lng) {
       const now = Date.now();
       if (now - lastDeviationCheck > 10000) {
         setLastDeviationCheck(now);
         const dist = getDistanceToPolyline(
           { lat: Number(assignedDriver.current_lat), lng: Number(assignedDriver.current_lng) }, 
           expectedPolyline
         );
         
         if (dist > 500 && (activeBooking as any).safety_status !== 'ok' && (activeBooking as any).safety_status !== 'escalated') {
           setRouteDeviationModalVisible(true);
           supabase.from('bookings').update({ safety_status: 'alert_triggered' }).eq('id', activeBooking.id).then();
         }
       }
    }
  }, [assignedDriver?.current_lat, assignedDriver?.current_lng, expectedPolyline, activeBooking, lastDeviationCheck]);

const popularHubs = EXPANDED_PRESETS.filter((p) => p.city === activeCity).slice(0, 4);

const resolvedVehicle = getResolvedVehicleDetails(assignedDriver, activeBooking, activeCity);

const driverDistM = assignedDriver?.current_lat && assignedDriver?.current_lng && pickupCoords?.lat
    ? haversineMeters(Number(assignedDriver.current_lat), Number(assignedDriver.current_lng), pickupCoords.lat, pickupCoords.lng)
    : null;

const driverEtaMin = driverDistM !== null
    ? Math.max(1, Math.round((driverDistM / 1000) / 0.45))
    : (activeBooking?.duration_min || 3);

const inProgressDistM = assignedDriver?.current_lat && assignedDriver?.current_lng && dropLocation?.lat
    ? haversineMeters(Number(assignedDriver.current_lat), Number(assignedDriver.current_lng), dropLocation.lat, dropLocation.lng)
    : null;

const inProgressDistKm = inProgressDistM !== null
    ? (inProgressDistM / 1000).toFixed(1)
    : (activeBooking?.distance_km?.toString() || '12');

  const value = { insets, topSafeOffset, step, setStep, user, setUser, authModalVisible, setAuthModalVisible, authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword, authConfirmPassword, setAuthConfirmPassword, authFullName, setAuthFullName, authPhone, setAuthPhone, authOtp, setAuthOtp, authOtpResendCooldown, setAuthOtpResendCooldown, authOtpLockoutRemaining, handleVerifyOtp, handleResendOtp, authSubmitting, setAuthSubmitting, vehicles, setVehicles, selectedVehicle, setSelectedVehicle, loading, setLoading, activeCity, setActiveCity, cityPickerVisible, setCityPickerVisible, pickupText, setPickupText, pickupCoords, setPickupCoords, dropLocation, setDropLocation, pickupPillar, setPickupPillar, searchModalVisible, setSearchModalVisible, pinPickerActive, setPinPickerActive, pinPickerTarget, setPinPickerTarget, pinCurrentCoords, setPinCurrentCoords, pinAddressText, setPinAddressText, isBookingPinConfirm, setIsBookingPinConfirm, cabinClimate, setCabinClimate, quietRide, setQuietRide, cabinPreferences, updateCabinPreferences, cabinModalVisible, setCabinModalVisible, paymentMethod, setPaymentMethod, bookingLoading, setBookingLoading, activeBooking, setActiveBooking, assignedDriver, setAssignedDriver, pendingSearchBooking, setPendingSearchBooking, chatModalVisible, setChatModalVisible, unreadChatCount, setUnreadChatCount, ratingModalVisible, setRatingModalVisible, profileModalVisible, setProfileModalVisible, guardianModalVisible, setGuardianModalVisible, guardianContact, setGuardianContact, sosAlertActive, setSosAlertActive, activeTab, setActiveTab, historyModalVisible, setHistoryModalVisible, amenitiesModalVisible, setAmenitiesModalVisible, walletBalance, setWalletBalance, walletModalVisible, setWalletModalVisible, scheduleModalVisible, setScheduleModalVisible, hourlyModalVisible, setHourlyModalVisible, routeDeviationModalVisible, setRouteDeviationModalVisible, scheduledDate, setScheduledDate, talkToOrangeVisible, setTalkToOrangeVisible, intermediateStop, setIntermediateStop, searchTarget, setSearchTarget, promoInput, setPromoInput, appliedPromo, setAppliedPromo, promoError, setPromoError, inAppNotification, setInAppNotification, savedHomeAddress, setSavedHomeAddress, savedWorkAddress, setSavedWorkAddress, hasToll, tollFare, tollDetails, customSavedPlaces, saveCustomPlace, deleteCustomPlace, handleQuickCustomPlace, theme, setTheme, handleToggleTheme, bookingStatusRef, pickupCoordsRef, dropLocationRef, lastDriverLocRef, nearbyDrivers, setNearbyDrivers, surgeMultiplier, checkActiveRide, initApp, refreshLocation, handleSelectCity, handleHomeMapPress, rawDist, distKm, durationMin, baseFare, perKm, minFare, distanceFare, stopFare, preTax, taxAmount, platformFee, calculatedPreDiscount, discountAmount, totalEstimatedFare, PROMO_CODES, handleApplyPromo, currentResumableBooking, activeScheduledBooking, rateNowBooking, dispatchStatus, setDispatchStatus, handlePinRegionChange, handleConfirmPinPicker, handleConfirmBooking, executeBookingSubmission, handleConfirmHourlyRental, handleQuickHome, handleQuickWork, handleQuickAirport, handleRepeatTrip, handleCancelRide, handleAuthSubmit, handleForgotPassword, handleSignOut, popularHubs, resolvedVehicle, driverDistM, driverEtaMin, inProgressDistM, inProgressDistKm };

  return (
    <RideContext.Provider value={value}>
      {children}
    </RideContext.Provider>
  );
};
