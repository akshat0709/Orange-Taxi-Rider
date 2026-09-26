import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  MapPin,
  Navigation,
  Car,
  Snowflake,
  VolumeX,
  Shield,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Clock,
  Sparkles,
  Phone,
  Radio,
  X,
  Check,
  ChevronRight,
  Search,
  Crosshair,
  CreditCard,
  Banknote,
  RotateCcw,
  User as UserIcon,
  LogOut,
  Mail,
  Lock,
  MessageSquare,
  Star,
  Map as MapIcon,
  ArrowLeft,
  ChevronDown,
  Sun,
  Moon,
  Calendar,
} from 'lucide-react-native';
import { supabase } from './src/lib/supabase';
import { VehicleCategory, Booking, Driver } from './src/types';
import { getResolvedVehicleDetails } from './src/lib/rideVehicle';
import { RideMap, haversineMeters } from './src/components/RideMap';
import { InRideChatModal } from './src/components/InRideChatModal';
import { RatingModal } from './src/components/RatingModal';
import { LocationSearchModal } from './src/components/LocationSearchModal';
import { ProfileModal, GuardianContact } from './src/components/ProfileModal';
import { RideHistoryModal } from './src/components/RideHistoryModal';
import { GuardianSafetyModal } from './src/components/GuardianSafetyModal';
import { AmenitiesModal } from './src/components/AmenitiesModal';
import { ScheduleModal } from './src/components/ScheduleModal';
import { TalkToOrangeModal } from './src/components/TalkToOrangeModal';
import {
  LocationItem,
  getSanitizedLocation,
  EXPANDED_PRESETS,
  getDefaultCityCenter,
  searchPlaces,
  isCoordinateInIndia,
  reverseGeocodeCoordSafe,
} from './src/lib/locationService';

const { width, height } = Dimensions.get('window');

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

function formatScheduleShort(d: Date): string {
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

function formatScheduleDate(d: Date): string {
  return (
    d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

function AppContent() {
  // Safe area insets — needed for absolute-positioned floating headers on Dynamic Island devices
  const insets = useSafeAreaInsets();
  // Reliable top clearance ensuring floating buttons sit comfortably below the Dynamic Island / notch
  const topSafeOffset = Math.max(insets.top, Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24)) + 12;

  // Navigation Stepper:
  // 1: Home Map & "Where to?" Explore
  // 2: Vehicle Selection & Route Review (Uber-style sheet)
  // 3: Searching Radar
  // 4: Active Ride & Live Chauffeur Tracking
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // User & Authentication
  const [user, setUser] = useState<any>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Fleet & Pricing
  const [vehicles, setVehicles] = useState<VehicleCategory[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory | null>(null);
  const [loading, setLoading] = useState(true);

  // Active City Selector
  const [activeCity, setActiveCity] = useState<'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad'>('Bengaluru');
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  // Locations State (Auto-detects live GPS & IP)
  const [pickupText, setPickupText] = useState('📍 Auto-detecting your location...');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9719, lng: 77.5937 });
  const [dropLocation, setDropLocation] = useState<LocationItem | null>(null);
  const [pickupPillar, setPickupPillar] = useState('');

  // Search Modal & Map Pin Picker States
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [pinPickerActive, setPinPickerActive] = useState(false);
  const [pinPickerTarget, setPinPickerTarget] = useState<'pickup' | 'drop'>('drop');
  const [pinCurrentCoords, setPinCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6315, lng: 77.2167 });
  const [pinAddressText, setPinAddressText] = useState('Detected Pin Location');
  const [isBookingPinConfirm, setIsBookingPinConfirm] = useState(false);

  // Hospitality Comforts
  const [cabinClimate, setCabinClimate] = useState<'chilled' | 'pleasant' | 'eco'>('chilled');
  const [quietRide, setQuietRide] = useState(false);

  // Payment & Fare
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
  // A booking in 'searching' state that we found on app resume — shown as a banner on step 1
  const [pendingSearchBooking, setPendingSearchBooking] = useState<Booking | null>(null);

  // In-Ride Chat, Rating, Profile & Guardian Safety Modals
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [guardianModalVisible, setGuardianModalVisible] = useState(false);
  const [guardianContact, setGuardianContact] = useState<GuardianContact | null>(null);

  // Minimalist Redesign (Option B) States
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'chat' | 'profile'>('home');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [amenitiesModalVisible, setAmenitiesModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Ride Scheduling
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

  // Talk to Orange 24x7 Concierge & AI Assistant Modal
  const [talkToOrangeVisible, setTalkToOrangeVisible] = useState(false);

  // Saved Places (Home & Work) for 1-Tap Quick Booking
  const [savedHomeAddress, setSavedHomeAddress] = useState('');
  const [savedWorkAddress, setSavedWorkAddress] = useState('');

  // Complete Light Theme by default with persistent Dark Mode toggle
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

  // -------------------------------------------------------------------------
  // INITIALIZATION & AUTH LISTENER
  // -------------------------------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      checkActiveRide(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkActiveRide(session.user.id);
      }
    });

    // Load saved guardian contact from local storage
    AsyncStorage.getItem('@orange_guardian_contact').then((stored) => {
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

    initApp();

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // Real-time background location watcher (updates automatically as user moves)
  useEffect(() => {
    let watcherSub: any = null;

    async function startLiveLocationWatch() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
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

  // Refs for tracking driver location and booking target in 4-second poll loop
  const bookingStatusRef = useRef(activeBooking?.status);
  bookingStatusRef.current = activeBooking?.status;

  const pickupCoordsRef = useRef(pickupCoords);
  pickupCoordsRef.current = pickupCoords;

  const dropLocationRef = useRef(dropLocation);
  dropLocationRef.current = dropLocation;

  const lastDriverLocRef = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch driver details whenever driver_id is assigned & poll every 4 seconds for live motion
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

            // If active ride and coordinates are stationary (simulator testing or idle driver)
            if ((currentStatus === 'accepted' || currentStatus === 'in_progress') && (dbStationary || !lastDriverLocRef.current)) {
              const dLat = targetCoords.lat - curLat;
              const dLng = targetCoords.lng - curLng;
              const distDeg = Math.hypot(dLat, dLng);

              // If more than ~25 meters from destination, take a smooth ~35m step along route vector
              if (distDeg > 0.00025) {
                const step = Math.min(0.00035, distDeg * 0.12);
                curLat = curLat + (dLat / distDeg) * step;
                curLng = curLng + (dLng / distDeg) * step;

                // Fire-and-forget Supabase update to keep all clients in sync
                supabase
                  .from('drivers')
                  .update({ current_lat: curLat, current_lng: curLng })
                  .eq('id', driverId)
                  .then(() => {}, () => {});
              }
            }

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
        .in('status', ['searching', 'accepted', 'arrived', 'in_progress'])
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
      // 1. Fetch live vehicle categories from Supabase
      const { data: vData } = await supabase
        .from('vehicle_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (vData && vData.length > 0) {
        setVehicles(vData);
        setSelectedVehicle(vData[0]);
      } else {
        const defaults: VehicleCategory[] = [
          { id: '1', code: 'ORANGE_GO', name: 'Orange Go', tagline: 'Smart electric hatchback for quick city hops', seats: 4, base_fare: 49, per_km: 12, minimum_fare: 99, sort_order: 1 },
          { id: '2', code: 'ORANGE_SEDAN', name: 'Orange Sedan', tagline: 'Mahindra BE.6 Luxury EV with extra legroom', seats: 4, base_fare: 59, per_km: 15, minimum_fare: 129, sort_order: 2 },
          { id: '3', code: 'ORANGE_XL', name: 'Orange XL', tagline: 'Six-seater electric SUV for groups & luggage', seats: 6, base_fare: 79, per_km: 20, minimum_fare: 179, sort_order: 3 },
        ];
        setVehicles(defaults);
        setSelectedVehicle(defaults[1]);
      }

      // 2. Acquire sanitized location
      await refreshLocation(activeCity);
    } catch (e) {
      console.warn('Init error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLocation(fallback: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad') {
    const locResult = await getSanitizedLocation(fallback);
    setPickupCoords({ lat: locResult.lat, lng: locResult.lng });
    setPickupText(locResult.displayText);
    setActiveCity(locResult.cityName);
  }

  // Handle City Switch from Quick Header Dropdown
  function handleSelectCity(city: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad') {
    Haptics.selectionAsync();
    setActiveCity(city);
    setCityPickerVisible(false);

    const defaultHub = getDefaultCityCenter(city, false);
    setPickupCoords({ lat: defaultHub.lat, lng: defaultHub.lng });
    setPickupText(defaultHub.displayText);
    setDropLocation(null);
  }

  // Handle 1-Tap Map Press to adjust pickup point anywhere on map
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

  // Distance & Fare Calculations
  const rawDist = dropLocation
    ? haversine(pickupCoords.lat, pickupCoords.lng, dropLocation.lat, dropLocation.lng)
    : 10;
  const distKm = Math.max(2.5, Math.round(rawDist * 10) / 10);
  const durationMin = Math.round(distKm / 0.45);

  const baseFare = selectedVehicle?.base_fare || 59;
  const perKm = selectedVehicle?.per_km || 15;
  const minFare = selectedVehicle?.minimum_fare || 129;
  const distanceFare = Math.round(perKm * distKm);
  const preTax = Math.max(minFare, baseFare + distanceFare);
  const taxAmount = Math.round(preTax * 0.05); // 5% GST (SAC 996412)
  const platformFee = 0;
  const totalEstimatedFare = preTax + taxAmount + platformFee;

  const currentResumableBooking =
    pendingSearchBooking ||
    (step === 1 && activeBooking && ['searching', 'accepted', 'arrived', 'in_progress'].includes(activeBooking.status)
      ? activeBooking
      : null);

  // -------------------------------------------------------------------------
  // AUTO-REFRESH SYNC (WebSocket + 2.5s Polling)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeBooking?.id) return;

    function applyBookingUpdate(newBooking: any) {
      if (!newBooking) return;
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
          }

          if (newBooking.status === 'completed' && prev.status !== 'completed') {
            setRatingModalVisible(true);
          }
          return { ...prev, ...newBooking };
        }
        return prev;
      });
    }

    const channel = supabase
      .channel(`booking-auto-${activeBooking.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${activeBooking.id}` },
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
          .eq('id', activeBooking.id)
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
  }, [activeBooking?.id]);

  // -------------------------------------------------------------------------
  // PIN PICKER ACTIONS ("CHOOSE ON MAP")
  // -------------------------------------------------------------------------
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
      setPickupCoords(pinCurrentCoords);
      setPickupText(pinAddressText);
      executeBookingSubmission(pinCurrentCoords, pinAddressText);
      return;
    }

    if (pinPickerTarget === 'pickup') {
      setPickupCoords(pinCurrentCoords);
      setPickupText(pinAddressText);
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
      setStep(2); // Proceed to ride selection
    }
    setPinPickerActive(false);
  }

  // -------------------------------------------------------------------------
  // BOOKING CONFIRMATION & EXACT PICKUP PIN DROP FLOW
  // -------------------------------------------------------------------------
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

    // Direct the user to drop the pin at their exact pickup location!
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPinPickerTarget('pickup');
    setPinCurrentCoords(pickupCoords);
    setPinAddressText(pickupText);
    setIsBookingPinConfirm(true);
    setPinPickerActive(true);
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
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          reference: ref,
          pickup_area: effectivePickup,
          pickup_address: `${effectiveCoords.lat},${effectiveCoords.lng}`,
          drop_area: dropLocation.name,
          drop_address: `${dropLocation.lat},${dropLocation.lng}`,
          distance_km: distKm,
          duration_min: durationMin,
          vehicle_code: selectedVehicle?.code || 'ORANGE_SEDAN',
          vehicle_name: selectedVehicle?.name || 'Orange Sedan',
          base_fare: baseFare,
          distance_fare: distanceFare,
          tax_amount: taxAmount,
          estimated_fare: totalEstimatedFare,
          payment_method: paymentMethod,
          ride_otp: otp,
          status: scheduledDate ? 'scheduled' : 'searching',
          scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
        })
        .select('*')
        .single();

      if (error) {
        console.error('DB insert error:', error);
        Alert.alert('Booking Notice', error.message || 'Unable to confirm booking. Please try again.');
        return;
      }

      setActiveBooking(data as Booking);
      setScheduledDate(null);
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
    const matches = await searchPlaces('Airport', activeCity, pickupCoords);
    if (matches.length > 0) {
      setDropLocation(matches[0]);
      setStep(2);
    } else {
      setSearchModalVisible(true);
    }
  }

  function handleRepeatTrip(pickupName: string, dropName: string) {
    setHistoryModalVisible(false);
    setActiveTab('home');
    if (pickupName) {
      setPickupText(pickupName);
    }
    if (dropName) {
      setDropLocation({
        id: 'repeat_' + Date.now(),
        name: dropName,
        subtitle: 'Past Trip Destination',
        city: (activeCity as any) || 'Bengaluru',
        lat: pickupCoords.lat + 0.05,
        lng: pickupCoords.lng + 0.05,
      });
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
          setAssignedDriver(null);
          setStep(1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  // -------------------------------------------------------------------------
  // AUTHENTICATION MODAL SUBMIT
  // -------------------------------------------------------------------------
  async function handleAuthSubmit() {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Required Fields', 'Please enter both your email and password.');
      return;
    }

    setAuthSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (authMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        setUser(data.user);
        setAuthModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        if (!authFullName.trim() || !authPhone.trim()) {
          Alert.alert('Required Fields', 'Please enter your Full Name and Phone number.');
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
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: authFullName.trim(),
            phone: authPhone.trim(),
            updated_at: new Date().toISOString(),
          });
          setUser(data.user);
        }
        setAuthModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Please check your details.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setActiveBooking(null);
    setAssignedDriver(null);
    setStep(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  // Top popular hubs for the active city to show on the Home Screen
  const popularHubs = EXPANDED_PRESETS.filter((p) => p.city === activeCity).slice(0, 4);

  // Resolved dynamic vehicle & chauffeur details
  const resolvedVehicle = getResolvedVehicleDetails(assignedDriver, activeBooking, activeCity);

  // Dynamic ETA & Distance calculation for Step 4 HUD
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

  return (
    <View style={[styles.container, theme === 'dark' && styles.containerDark]}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />

        {/* ================================================================= */}
        {/* FLOATING TOP HEADERS (OPTION B MINIMAL DESIGN)                    */}
        {/* ================================================================= */}
        {pinPickerActive ? null : step === 1 ? (
          /* STEP 1: FLOATING ISLAND HEADER */
          <View style={[styles.floatingIslandHeader, { top: topSafeOffset }]}>
            {/* User Profile Avatar Circle */}
            <TouchableOpacity
              style={[styles.floatingAvatarBtn, theme === 'dark' && styles.floatingAvatarBtnDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                setProfileModalVisible(true);
              }}
            >
              {user ? (
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarChar}>
                    {(user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                </View>
              ) : (
                <UserIcon size={19} color={theme === 'dark' ? '#F8FAFC' : '#18181B'} />
              )}
            </TouchableOpacity>

            {/* Floating Wallet Pill */}
            <TouchableOpacity
              style={[styles.floatingWalletPill, theme === 'dark' && styles.floatingWalletPillDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert(
                  'Orange Wallet',
                  `Current Balance: ₹${walletBalance}\n\nOnline wallet recharge via Razorpay / UPI is coming soon! Payment gateway integration is currently in progress.\n\nCurrently, trips can be paid directly via Cash or UPI on arrival.`,
                  [{ text: 'Got it', style: 'default' }]
                );
              }}
            >
              <CreditCard size={15} color={theme === 'dark' ? '#F97316' : '#18181B'} />
              <Text style={[styles.floatingWalletText, theme === 'dark' && styles.textWhite]}>₹ {walletBalance}</Text>
              <View style={styles.walletSoonBadge}>
                <Text style={styles.walletSoonBadgeText}>SOON</Text>
              </View>
            </TouchableOpacity>

            {/* Right Action Cluster: Theme Switcher & City Selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Quick Theme Switcher Button (☀️ Light Default / 🌙 Dark Mode) */}
              <TouchableOpacity
                style={[styles.floatingThemeBtn, theme === 'dark' && styles.floatingThemeBtnDark]}
                activeOpacity={0.85}
                onPress={() => handleToggleTheme()}
                accessibilityLabel={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun size={17} color="#F97316" />
                ) : (
                  <Moon size={17} color="#475569" />
                )}
              </TouchableOpacity>

              {/* City Switcher Circular Button */}
              <TouchableOpacity
                style={[styles.floatingCityBtn, theme === 'dark' && styles.floatingCityBtnDark]}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCityPickerVisible(!cityPickerVisible);
                }}
              >
                <MapPin size={18} color="#F97316" />
              </TouchableOpacity>
            </View>

            {/* Floating City Dropdown Menu */}
            {cityPickerVisible && (
              <View style={[styles.floatingCityMenu, theme === 'dark' && styles.floatingCityMenuDark]}>
                <Text style={[styles.cityMenuHeader, theme === 'dark' && styles.textMutedDark]}>SELECT CITY</Text>
                {(['Delhi NCR', 'Bengaluru', 'Mumbai', 'Hyderabad'] as const).map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityMenuItem, activeCity === city && styles.cityMenuItemActive]}
                    onPress={() => {
                      handleSelectCity(city);
                      setCityPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.cityMenuItemText, activeCity === city && styles.cityMenuItemTextActive]}>
                      {city}
                    </Text>
                    {activeCity === city && <Check size={14} color="#F97316" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : step === 4 ? (
          /* STEP 4: FLOATING ARRIVING / IN-PROGRESS HEADER */
          <View style={[styles.arrivingTopHeader, theme === 'dark' && styles.arrivingTopHeaderDark, { top: topSafeOffset }]}>
            <TouchableOpacity
              style={[styles.arrivingBackBtn, theme === 'dark' && styles.arrivingBackBtnDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (activeBooking) {
                  setPendingSearchBooking(activeBooking);
                }
                setStep(1);
              }}
            >
              <ArrowLeft size={18} color={theme === 'dark' ? '#F8FAFC' : '#18181B'} />
            </TouchableOpacity>

            <Text style={[styles.arrivingHeaderTitle, theme === 'dark' && styles.textWhite]}>
              {activeBooking?.status === 'in_progress'
                ? 'Ride in Progress'
                : activeBooking?.status === 'arrived'
                ? 'Chauffeur Arrived'
                : activeBooking?.status === 'accepted'
                ? 'Arriving'
                : 'Connecting'}
            </Text>

            <TouchableOpacity
              style={[styles.arrivingShieldBtn, theme === 'dark' && styles.arrivingShieldBtnDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setGuardianModalVisible(true);
              }}
            >
              <ShieldCheck size={18} color="#10B981" />
            </TouchableOpacity>
          </View>
        ) : step === 2 ? (
          /* STEP 2: MINIMAL VEHICLE SELECTION HEADER */
          <View style={[styles.step2Header, theme === 'dark' && styles.step2HeaderDark]}>
            <TouchableOpacity
              style={[styles.step2BackBtn, theme === 'dark' && styles.step2BackBtnDark]}
              activeOpacity={0.85}
              onPress={() => setStep(1)}
            >
              <ArrowLeft size={18} color={theme === 'dark' ? '#F8FAFC' : '#18181B'} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.step2HeaderTitle, theme === 'dark' && styles.textWhite]}>Select Ride</Text>
              <Text style={styles.step2HeaderSub}>100% Zero-Emission EV Fleet</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        ) : null}

        {/* ================================================================= */}
        {/* VIEW ROUTER                                                       */}
        {/* ================================================================= */}
        {loading ? (
          <View style={[styles.centerLoading, theme === 'dark' && styles.containerDark]}>
            <ActivityIndicator size="large" color="#F56B00" />
            <Text style={[styles.loadingText, theme === 'dark' && styles.textMutedDark]}>Initializing Orange Electric Fleet...</Text>
          </View>
        ) : pinPickerActive ? (
          /* =============================================================== */
          /* PIN PICKER MODE ("SET ON MAP")                                  */
          /* =============================================================== */
          <View style={[styles.pinPickerContainer, theme === 'dark' && styles.containerDark]}>
            <View style={[styles.pinPickerHeader, theme === 'dark' && styles.pinPickerHeaderDark, { paddingTop: topSafeOffset, paddingBottom: 12 }]}>
              <TouchableOpacity
                style={[styles.pinPickerBackBtn, theme === 'dark' && styles.pinPickerBackBtnDark]}
                onPress={() => {
                  setPinPickerActive(false);
                  if (isBookingPinConfirm) {
                    setIsBookingPinConfirm(false);
                  }
                }}
              >
                <ArrowLeft size={20} color={theme === 'dark' ? '#F8FAFC' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={[styles.pinPickerTitle, theme === 'dark' && styles.textWhite]}>
                {isBookingPinConfirm
                  ? 'Confirm Exact Pickup Spot'
                  : pinPickerTarget === 'pickup'
                  ? 'Set Pickup Location'
                  : 'Set Destination'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Instruction Banner if booking pin confirm */}
            {isBookingPinConfirm && (
              <View style={styles.pinDropHintBanner}>
                <Sparkles size={14} color="#F97316" />
                <Text style={styles.pinDropHintText}>
                  Move map to drop pin at your exact gate or curb
                </Text>
              </View>
            )}

            {/* Full Screen Map with fixed Center Pin */}
            <View style={{ flex: 1 }}>
              <RideMap
                pickup={pinCurrentCoords}
                interactive={true}
                height="100%"
                isPinPickerMode={true}
                pinPickerTarget={pinPickerTarget}
                onPinLocationChange={handlePinRegionChange}
                theme={theme}
              />
            </View>

            {/* Bottom Confirmation Card */}
            <View style={[styles.pinPickerBottomCard, theme === 'dark' && styles.pinPickerBottomCardDark]}>
              <View style={styles.pinAddressRow}>
                <MapPin size={18} color="#F97316" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.pinAddressMicro, theme === 'dark' && styles.textMutedDark]}>
                    {isBookingPinConfirm ? 'EXACT PICKUP SPOT' : 'PINPOINTED LOCATION'}
                  </Text>
                  <Text style={[styles.pinAddressText, theme === 'dark' && styles.textWhite]} numberOfLines={2}>
                    {pinAddressText}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pinConfirmBtn}
                disabled={bookingLoading}
                onPress={handleConfirmPinPicker}
              >
                {bookingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.pinConfirmText}>
                      {isBookingPinConfirm
                        ? `Confirm Pickup & Book · ₹${totalEstimatedFare}`
                        : 'Confirm Location'}
                    </Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : step === 4 && activeBooking ? (
          /* =============================================================== */
          /* STEP 4: ACTIVE RIDE, LIVE GPS & REAL-TIME DRIVER STATUS         */
          /* =============================================================== */
          <View style={{ flex: 1, position: 'relative' }}>
            {/* Live Interactive Map Tracking */}
            <View style={StyleSheet.absoluteFill}>
              <RideMap
                pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: activeBooking.pickup_area }}
                drop={{
                  lat: dropLocation?.lat ?? (activeBooking.drop_address && activeBooking.drop_address.includes(',') ? Number(activeBooking.drop_address.split(',')[0]) : pickupCoords.lat),
                  lng: dropLocation?.lng ?? (activeBooking.drop_address && activeBooking.drop_address.includes(',') ? Number(activeBooking.drop_address.split(',')[1]) : pickupCoords.lng),
                  name: activeBooking.drop_area,
                }}
                driverLocation={
                  assignedDriver?.current_lat && assignedDriver?.current_lng
                    ? { lat: assignedDriver.current_lat, lng: assignedDriver.current_lng }
                    : null
                }
                status={activeBooking.status}
                height="100%"
                routeDistanceKm={activeBooking.distance_km}
                routeDurationMin={activeBooking.duration_min}
                theme={theme}
              />
            </View>

            {/* Floating Minimal Arriving HUD Card (Option B) */}
            <View style={[styles.floatingArrivingCard, theme === 'dark' && styles.floatingArrivingCardDark]}>
              {/* Header: Title + ETA badge */}
              <View style={styles.arrivingCardHeader}>
                <View>
                  <Text style={[styles.arrivingTitleText, theme === 'dark' && styles.textWhite]}>
                    {activeBooking.status === 'scheduled'
                      ? 'Ride Scheduled'
                      : activeBooking.status === 'in_progress'
                      ? 'In Progress'
                      : activeBooking.status === 'arrived'
                      ? 'Arrived'
                      : activeBooking.status === 'accepted'
                      ? 'Arriving'
                      : 'Connecting'}
                  </Text>
                  <Text style={[styles.arrivingSubSubtitle, theme === 'dark' && styles.textMutedDark]}>
                    {activeBooking.status === 'scheduled'
                      ? activeBooking.scheduled_at
                        ? `Pickup on ${formatScheduleShort(new Date(activeBooking.scheduled_at))}`
                        : 'Chauffeur reserved for scheduled departure'
                      : activeBooking.status === 'in_progress'
                      ? 'Cruising safely to destination'
                      : activeBooking.status === 'arrived'
                      ? 'Chauffeur waiting at pickup'
                      : activeBooking.status === 'accepted'
                      ? 'Chauffeur en route to pickup'
                      : 'Locating closest verified electric cab'}
                  </Text>
                </View>

                <View style={styles.arrivingEtaBadge}>
                  <Text style={styles.arrivingEtaText}>
                    {activeBooking.status === 'scheduled'
                      ? '📅 Confirmed'
                      : activeBooking.status === 'in_progress'
                      ? `⚡ ${inProgressDistKm} km`
                      : activeBooking.status === 'accepted'
                      ? driverDistM !== null && driverDistM < 100
                        ? 'Arriving'
                        : `${driverEtaMin} min`
                      : '⚡ Active'}
                  </Text>
                </View>
              </View>

              {/* Chauffeur & Vehicle Profile Row */}
              {activeBooking.status === 'scheduled' ? (
                <View style={[styles.scheduledHudBox, theme === 'dark' && styles.scheduledHudBoxDark]}>
                  <View style={styles.scheduledHudIconRow}>
                    <Calendar size={16} color="#7C3AED" />
                    <Text style={[styles.scheduledHudDateText, theme === 'dark' && styles.textWhite]}>
                      {activeBooking.scheduled_at
                        ? formatScheduleDate(new Date(activeBooking.scheduled_at))
                        : 'Scheduled Ride'}
                    </Text>
                  </View>
                  <Text style={[styles.scheduledHudSubText, theme === 'dark' && styles.textMutedDark]}>
                    Zero surge guarantee locked. Chauffeur assigned 30 mins before pickup with pre-cooled AC.
                  </Text>
                </View>
              ) : activeBooking.status === 'searching' ? (
                <View style={styles.searchingFleetRow}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={styles.searchingFleetText}>
                    Broadcasting to nearby Orange EV Chauffeurs...
                  </Text>
                </View>
              ) : (
                <View style={styles.driverProfileMinimalRow}>
                  {/* Driver Avatar */}
                  <View style={[styles.driverAvatarCircle, theme === 'dark' && styles.driverAvatarCircleDark]}>
                    <Text style={styles.driverAvatarLetter}>
                      {resolvedVehicle.chauffeurName.charAt(0) || 'D'}
                    </Text>
                  </View>

                  {/* Driver & Car Meta */}
                  <View style={styles.driverMetaCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.driverNameTitle, theme === 'dark' && styles.textWhite]} numberOfLines={1}>
                        {resolvedVehicle.chauffeurName}
                      </Text>
                      {resolvedVehicle.isPartner && (
                        <View style={styles.partnerPill}>
                          <Text style={styles.partnerPillText}>Partner</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.vehicleModelSub, theme === 'dark' && styles.textMutedDark]} numberOfLines={1}>
                      {resolvedVehicle.modelName} · 100% EV
                    </Text>
                  </View>

                  {/* Rating & Number Plate Pills */}
                  <View style={styles.driverPillsRow}>
                    <View style={styles.ratingPillYellow}>
                      <Text style={styles.ratingPillText}>★ {resolvedVehicle.rating}</Text>
                    </View>
                    <View style={styles.platePillMono}>
                      <Text style={styles.platePillText}>{resolvedVehicle.plateNumber}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Circular Tactile Action Buttons Row (Mockup: Cancel, Chat, Call) */}
              <View style={styles.circularActionsRow}>
                {/* Circular Cancel Action */}
                {activeBooking.status !== 'in_progress' && activeBooking.status !== 'completed' ? (
                  <TouchableOpacity
                    style={[styles.circularActionCancel, theme === 'dark' && styles.circularActionCancelDark]}
                    activeOpacity={0.8}
                    onPress={handleCancelRide}
                  >
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.circularActionCancel, { backgroundColor: '#ECFDF5' }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      Alert.alert('Trip Information', `Booking: ${activeBooking.reference}\nFare: ₹${activeBooking.estimated_fare}\nDestination: ${activeBooking.drop_area}`);
                    }}
                  >
                    <Check size={20} color="#10B981" />
                  </TouchableOpacity>
                )}

                {/* Circular In-Ride Chat Action */}
                <TouchableOpacity
                  style={styles.circularActionChat}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setUnreadChatCount(0);
                    setChatModalVisible(true);
                  }}
                >
                  <MessageSquare size={20} color="#FFFFFF" />
                  {unreadChatCount > 0 && (
                    <View style={styles.chatBadgeAbsolute}>
                      <Text style={styles.chatBadgeText}>{unreadChatCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Circular Call Action */}
                <TouchableOpacity
                  style={styles.circularActionCall}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (resolvedVehicle.phone) {
                      Linking.openURL(`tel:${resolvedVehicle.phone}`);
                    } else {
                      Linking.openURL('tel:1800123456');
                    }
                  }}
                >
                  <Phone size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Ride Start OTP Pill (Revealed only after driver accepts) */}
              {activeBooking.status === 'in_progress' ? (
                <View style={styles.inProgressPillBar}>
                  <CheckCircle size={15} color="#10B981" />
                  <Text style={styles.inProgressPillText}>OTP Verified · Fare ₹{activeBooking.estimated_fare}</Text>
                </View>
              ) : (activeBooking.status === 'accepted' || activeBooking.status === 'arrived') && activeBooking.ride_otp ? (
                <View style={styles.otpPillBar}>
                  <Text style={styles.otpPillLabel}>START OTP</Text>
                  <Text style={styles.otpPillCode}>{activeBooking.ride_otp}</Text>
                  <Text style={styles.otpPillSub}>Share with chauffeur to start trip</Text>
                </View>
              ) : activeBooking.status === 'searching' ? (
                <View style={styles.searchingOtpBar}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={styles.searchingOtpText}>
                    Searching nearby chauffeurs · OTP will reveal once ride is accepted
                  </Text>
                </View>
              ) : null}

              {/* Onboard Amenities Tray */}
              <TouchableOpacity
                style={styles.onboardAmenitiesBar}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAmenitiesModalVisible(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Sparkles size={13} color="#F97316" />
                  <Text style={styles.onboardAmenitiesText} numberOfLines={1}>
                    Onboard: Chilled Water · In-Seat Screen · Dailies
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={styles.onboardAmenitiesViewText}>Perks</Text>
                  <ChevronRight size={12} color="#F97316" />
                </View>
              </TouchableOpacity>

              {/* Safety & SOS Strip */}
              <View style={styles.safetyStripRow}>
                <TouchableOpacity
                  style={styles.safetyStripBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setGuardianModalVisible(true);
                  }}
                >
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.safetyStripText}>Orange Guardian Active</Text>
                </TouchableOpacity>
                <Text style={styles.bookingRefMicro}>Ref: {activeBooking.reference}</Text>
              </View>
            </View>
          </View>
        ) : step === 2 ? (
          /* =============================================================== */
          /* STEP 2: RIDE SELECTION & ROUTE REVIEW (UBER/OLA STYLE SHEET)     */
          /* =============================================================== */
          <View style={{ flex: 1 }}>
            {/* Top Route Map */}
            <View style={{ height: height * 0.35, position: 'relative' }}>
              <RideMap
                pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: pickupText }}
                drop={dropLocation ? { lat: dropLocation.lat, lng: dropLocation.lng, name: dropLocation.name } : undefined}
                interactive={true}
                height="100%"
                routeDistanceKm={distKm}
                routeDurationMin={durationMin}
                theme={theme}
              />
              {/* Floating Back Button on Map */}
              <TouchableOpacity
                style={[
                  styles.floatingBackCircleBtn,
                  theme === 'dark' && styles.floatingBackCircleBtnDark,
                  { top: topSafeOffset, left: 16 },
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep(1);
                }}
              >
                <ArrowLeft size={18} color={theme === 'dark' ? '#F8FAFC' : '#18181B'} />
              </TouchableOpacity>
            </View>

            {/* Bottom Swipeable Booking Sheet */}
            <ScrollView style={[styles.sheetScroll, theme === 'dark' && styles.sheetScrollDark]} showsVerticalScrollIndicator={false}>
              {/* Pickup -> Destination Bar (Tap to re-edit anytime) */}
              <TouchableOpacity
                style={[styles.sheetRouteBar, theme === 'dark' && styles.sheetRouteBarDark]}
                onPress={() => setSearchModalVisible(true)}
              >
                <View style={styles.sheetRouteVisual}>
                  <View style={styles.sheetGreenDot} />
                  <View style={styles.sheetLine} />
                  <View style={styles.sheetOrangeDot} />
                </View>
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <Text style={styles.sheetRoutePickup} numberOfLines={1}>
                    {pickupText}
                  </Text>
                  <Text style={[styles.sheetRouteDrop, theme === 'dark' && styles.textWhite]} numberOfLines={1}>
                    {dropLocation ? dropLocation.name : 'Select drop-off destination'}
                  </Text>
                </View>
                <View style={[styles.sheetEditBtn, theme === 'dark' && styles.sheetEditBtnDark]}>
                  <Text style={styles.sheetEditText}>Edit</Text>
                </View>
              </TouchableOpacity>

              {/* Optional Airport / Metro Pickup Gate Note */}
              <View style={[styles.gateNoteBox, theme === 'dark' && styles.gateNoteBoxDark]}>
                <TextInput
                  style={[styles.gateNoteInput, theme === 'dark' && styles.textWhite]}
                  placeholder="Pillar / Gate / Landmark (e.g. Pillar 3, Gate 4)"
                  placeholderTextColor={theme === 'dark' ? '#64748B' : '#94A3B8'}
                  value={pickupPillar}
                  onChangeText={setPickupPillar}
                />
              </View>

              {/* VEHICLE FLEET SELECTION LIST */}
              <Text style={[styles.sheetSectionTitle, theme === 'dark' && styles.textMutedDark]}>CHOOSE YOUR ELECTRIC RIDE</Text>
              <View style={styles.sheetFleetList}>
                {vehicles.map((v) => {
                  const isSel = selectedVehicle?.code === v.code;
                  // Dynamic live price calculation for each vehicle
                  const vBase = v.base_fare;
                  const vPerKm = v.per_km;
                  const vMin = v.minimum_fare;
                  const vPreTax = Math.max(vMin, vBase + Math.round(vPerKm * distKm));
                  const vTotal = Math.round(vPreTax * 1.05);

                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.sheetFleetCard,
                        isSel && styles.sheetFleetCardActive,
                        theme === 'dark' && (isSel ? styles.sheetFleetCardActiveDark : styles.sheetFleetCardDark),
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedVehicle(v);
                      }}
                    >
                      <View style={[styles.sheetFleetIconBox, theme === 'dark' && styles.sheetFleetIconBoxDark]}>
                        <Car size={22} color={isSel ? '#F56B00' : '#CBD5E1'} />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.sheetFleetName, theme === 'dark' && styles.textWhite]}>{v.name}</Text>
                          <View style={styles.sheetSeatsPill}>
                            <Text style={styles.sheetSeatsText}>{v.seats} Seats</Text>
                          </View>
                        </View>
                        <Text style={[styles.sheetFleetTagline, theme === 'dark' && styles.textMutedDark]} numberOfLines={1}>
                          {v.tagline || (v.code === 'ORANGE_SEDAN' ? 'Mahindra BE.6 Luxury EV' : v.code === 'ORANGE_XL' ? '6-Seater Electric SUV' : 'Tata Tiago Smart EV')}
                        </Text>
                        <Text style={styles.sheetFleetEta}>
                          {v.code === 'ORANGE_SEDAN' ? '⚡ 3 min away · Most Popular' : '⚡ 4-5 min away'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.sheetFleetFare, theme === 'dark' && styles.textWhite]}>₹{vTotal}</Text>
                        <Text style={styles.sheetFleetPerKm}>₹{v.per_km}/km</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* INCLUDED IN-CAB AMENITIES CARD */}
              <TouchableOpacity
                style={[styles.step2AmenitiesCard, theme === 'dark' && styles.step2AmenitiesCardDark]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAmenitiesModalVisible(true);
                }}
              >
                <View style={styles.step2AmenitiesHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#F97316" />
                    <Text style={[styles.step2AmenitiesTitle, theme === 'dark' && styles.textWhite]}>Included With Your {selectedVehicle?.name || 'Ride'}</Text>
                  </View>
                  <View style={styles.freeTagBadge}>
                    <Text style={styles.freeTagBadgeText}>100% INCLUDED</Text>
                  </View>
                </View>

                <View style={styles.step2AmenitiesGrid}>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>📺</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>In-Seat Screen</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>🎵</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>Studio Audio</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>💧</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>Bottled Water</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>📰</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>Daily Papers</Text>
                  </View>
                </View>

                <View style={styles.step2AmenitiesFooter}>
                  <Text style={[styles.step2AmenitiesFooterText, theme === 'dark' && styles.textMutedDark]}>Pre-cooled AC · Clean EV · Zero surge guarantee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={styles.step2AmenitiesDetailsLink}>Details</Text>
                    <ChevronRight size={12} color="#F97316" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* DEPARTURE TIME: RIDE NOW OR SCHEDULE */}
              <View style={[styles.departureCard, theme === 'dark' && styles.departureCardDark]}>
                <View style={styles.departureHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color="#F97316" />
                    <Text style={[styles.departureTitle, theme === 'dark' && styles.textWhite]}>
                      DEPARTURE TIME
                    </Text>
                  </View>
                  {scheduledDate && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        setScheduledDate(null);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.departureResetText}>Switch to Now</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.departureToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.departureToggleBtn,
                      !scheduledDate && styles.departureToggleBtnActive,
                      theme === 'dark' && styles.departureToggleBtnDark,
                      !scheduledDate && theme === 'dark' && styles.departureToggleBtnActiveDark,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setScheduledDate(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.departureToggleText,
                        !scheduledDate && styles.departureToggleTextActive,
                        theme === 'dark' && !scheduledDate && styles.textWhite,
                      ]}
                    >
                      ⚡ Ride Now
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.departureToggleBtn,
                      scheduledDate && styles.departureToggleBtnActive,
                      theme === 'dark' && styles.departureToggleBtnDark,
                      scheduledDate && theme === 'dark' && styles.departureToggleBtnActiveDark,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setScheduleModalVisible(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.departureToggleText,
                        scheduledDate && styles.departureToggleTextActive,
                        theme === 'dark' && scheduledDate && styles.textWhite,
                      ]}
                      numberOfLines={1}
                    >
                      📅 {scheduledDate ? formatScheduleShort(scheduledDate) : 'Schedule for Later'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {scheduledDate && (
                  <View style={styles.scheduledBannerInfo}>
                    <Sparkles size={12} color="#F97316" />
                    <Text style={[styles.scheduledBannerInfoText, theme === 'dark' && styles.textMutedDark]}>
                      Zero surge locked · Chauffeur arrives 10 mins early with pre-cooled AC
                    </Text>
                  </View>
                )}
              </View>

              {/* SIGNATURE HOSPITALITY PREFERENCES */}
              <View style={[styles.sheetHospitalityCard, theme === 'dark' && styles.sheetHospitalityCardDark]}>
                <Text style={[styles.sheetHospitalityTitle, theme === 'dark' && styles.textWhite]}>SIGNATURE COMFORT</Text>

                <View style={styles.climateRow}>
                  {[
                    { id: 'chilled', label: 'Chilled (19°C)' },
                    { id: 'pleasant', label: 'Pleasant (22°C)' },
                    { id: 'eco', label: 'Eco AC (24°C)' },
                  ].map(({ id, label }) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.climateChip,
                        cabinClimate === id && styles.climateChipActive,
                        theme === 'dark' && styles.climateChipDark,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCabinClimate(id as any);
                      }}
                    >
                      <Snowflake size={12} color={cabinClimate === id ? '#F56B00' : '#9CA3AF'} />
                      <Text style={[styles.climateChipText, cabinClimate === id && styles.climateChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quiet Mode Toggle */}
                <TouchableOpacity
                  style={[styles.quietToggle, quietRide && styles.quietToggleActive, theme === 'dark' && styles.quietToggleDark]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setQuietRide(!quietRide);
                  }}
                >
                  <VolumeX size={16} color={quietRide ? '#F56B00' : '#9CA3AF'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.quietToggleTitle, quietRide && styles.quietToggleTitleActive, theme === 'dark' && styles.textWhite]}>
                      Quiet Ride Mode
                    </Text>
                    <Text style={[styles.quietToggleSub, theme === 'dark' && styles.textMutedDark]}>Chauffeur will keep conversation minimal</Text>
                  </View>
                  <View style={[styles.quietCheckbox, quietRide && styles.quietCheckboxActive]}>
                    {quietRide && <Check size={10} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              </View>

              {/* PAYMENT METHOD SELECTOR */}
              <View style={styles.paymentMethodRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentChip,
                    paymentMethod === 'cash' && styles.paymentChipActive,
                    theme === 'dark' && styles.paymentChipDark,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod('cash');
                  }}
                >
                  <Banknote size={16} color={paymentMethod === 'cash' ? '#F56B00' : '#9CA3AF'} />
                  <Text style={[styles.paymentChipText, paymentMethod === 'cash' && styles.paymentChipTextActive]}>
                    Cash on Arrival
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentChip,
                    paymentMethod === 'upi' && styles.paymentChipActive,
                    theme === 'dark' && styles.paymentChipDark,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod('upi');
                  }}
                >
                  <CreditCard size={16} color={paymentMethod === 'upi' ? '#F56B00' : '#9CA3AF'} />
                  <Text style={[styles.paymentChipText, paymentMethod === 'upi' && styles.paymentChipTextActive]}>
                    UPI / QR Code
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CONFIRM & BOOK CTA BUTTON */}
              <View style={styles.bookCtaRow}>
                <TouchableOpacity
                  style={[styles.secondaryBackBtn, theme === 'dark' && styles.secondaryBackBtnDark]}
                  onPress={() => setStep(1)}
                >
                  <ArrowLeft size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bookPrimaryBtn}
                  disabled={bookingLoading}
                  onPress={handleConfirmBooking}
                >
                  {bookingLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.bookPrimaryText}>
                        {scheduledDate
                          ? `Schedule ${selectedVehicle?.name || 'Ride'} · ${formatScheduleShort(scheduledDate)}`
                          : `Book ${selectedVehicle?.name || 'Ride'} · ₹${totalEstimatedFare}`}
                      </Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ height: 36 }} />
            </ScrollView>
          </View>
        ) : (
          /* =============================================================== */
          /* STEP 1: UBER / OLA MAP-FIRST HOME SCREEN                        */
          /* =============================================================== */
          <View style={{ flex: 1, position: 'relative' }}>
            {/* Full Screen Interactive Minimalist Map */}
            <View style={StyleSheet.absoluteFill}>
              <RideMap
                pickup={pickupCoords}
                interactive={true}
                height="100%"
                onMapPress={handleHomeMapPress}
                onRecenterPress={() => refreshLocation(activeCity)}
                theme={theme}
              />
            </View>

            {/* Floating Minimal Two-Stop Destination Card (Option B) */}
            <View
              style={[
                styles.minimalDestCard,
                theme === 'dark' && styles.minimalDestCardDark,
                { bottom: Math.max(insets.bottom, 12) + 72 },
              ]}
            >
              {/* ── ACTIVE / SEARCHING RIDE RESUME BANNER ── */}
              {currentResumableBooking && (
                <TouchableOpacity
                  style={[styles.resumeRideHomeCard, theme === 'dark' && styles.resumeRideHomeCardDark]}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setActiveBooking(currentResumableBooking);
                    setPendingSearchBooking(null);
                    setStep(4);
                  }}
                >
                  <View style={styles.resumeRideLeft}>
                    <View style={styles.resumeRidePulseContainer}>
                      <View style={styles.resumeRidePulseRing} />
                      <View style={styles.resumeRidePulseDot} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.resumeRideTitle, theme === 'dark' && styles.textWhite]}>
                        {currentResumableBooking.status === 'searching'
                          ? 'Searching for EV Chauffeur…'
                          : 'Ride in Progress'}
                      </Text>
                      <Text
                        style={[styles.resumeRideSubtitle, theme === 'dark' && styles.textMutedDark]}
                        numberOfLines={1}
                      >
                        {currentResumableBooking.pickup_area || 'Pickup'} → {currentResumableBooking.drop_area || 'Destination'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resumeRideActionBtn}>
                    <Text style={styles.resumeRideActionText}>
                      {currentResumableBooking.status === 'searching' ? 'Resume Booking →' : 'Track Ride →'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Pickup Row: "Where are you?" */}
              <TouchableOpacity
                style={styles.destStopRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchModalVisible(true);
                }}
              >
                <View style={[styles.destOrangeHollowRing, theme === 'dark' && styles.destOrangeHollowRingDark]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.destMicroLabel, theme === 'dark' && styles.textMutedDark]}>Where are you?</Text>
                  <Text style={[styles.destPrimaryAddress, theme === 'dark' && styles.textWhite]} numberOfLines={1}>
                    {pickupText}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.destPinIconBtn, theme === 'dark' && styles.destPinIconBtnDark]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setPinPickerTarget('pickup');
                    setPinCurrentCoords(pickupCoords);
                    setPinAddressText(pickupText);
                    setPinPickerActive(true);
                  }}
                >
                  <MapIcon size={16} color={theme === 'dark' ? '#94A3B8' : '#9CA3AF'} />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Vertical connector line */}
              <View style={[styles.destConnectorLine, theme === 'dark' && styles.destConnectorLineDark]} />

              {/* Destination Row: "Where you want to go?" */}
              <TouchableOpacity
                style={styles.destStopRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchModalVisible(true);
                }}
              >
                <View style={[styles.destCarIconBox, theme === 'dark' && styles.destCarIconBoxDark]}>
                  <Car size={16} color={theme === 'dark' ? '#F97316' : '#18181B'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.destMicroLabel, theme === 'dark' && styles.textMutedDark]}>Drop Off</Text>
                  <Text
                    style={[
                      dropLocation ? styles.destPrimaryAddress : styles.destPlaceholderText,
                      theme === 'dark' && (dropLocation ? styles.textWhite : styles.destPlaceholderTextDark),
                    ]}
                    numberOfLines={1}
                  >
                    {dropLocation ? dropLocation.name : 'Where you want to go?'}
                  </Text>
                </View>

                {/* Schedule Ride Quick Action Button */}
                <TouchableOpacity
                  style={[
                    styles.destScheduleBtn,
                    scheduledDate && styles.destScheduleBtnActive,
                    theme === 'dark' && styles.destScheduleBtnDark,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setScheduleModalVisible(true);
                  }}
                >
                  <Calendar size={13} color={scheduledDate ? '#FFFFFF' : '#F97316'} />
                  <Text
                    style={[
                      styles.destScheduleBtnText,
                      scheduledDate && styles.destScheduleBtnTextActive,
                      theme === 'dark' && !scheduledDate && styles.textWhite,
                    ]}
                    numberOfLines={1}
                  >
                    {scheduledDate ? formatScheduleShort(scheduledDate) : 'Schedule'}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.destSearchCircle, theme === 'dark' && styles.destSearchCircleDark]}>
                  <Search size={15} color="#F97316" />
                </View>
              </TouchableOpacity>

              {/* Quick Filter Chips: Home, Work, Airport */}
              <View style={[styles.minimalChipsRow, theme === 'dark' && styles.minimalChipsRowDark]}>
                <TouchableOpacity
                  style={[styles.minimalChip, theme === 'dark' && styles.minimalChipDark]}
                  activeOpacity={0.75}
                  onPress={handleQuickHome}
                >
                  <Text style={[styles.minimalChipText, theme === 'dark' && styles.minimalChipTextDark]} numberOfLines={1}>
                    🏠 Home
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.minimalChip, theme === 'dark' && styles.minimalChipDark]}
                  activeOpacity={0.75}
                  onPress={handleQuickWork}
                >
                  <Text style={[styles.minimalChipText, theme === 'dark' && styles.minimalChipTextDark]} numberOfLines={1}>
                    💼 Work
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.minimalChip, theme === 'dark' && styles.minimalChipDark]}
                  activeOpacity={0.75}
                  onPress={handleQuickAirport}
                >
                  <Text style={[styles.minimalChipText, theme === 'dark' && styles.minimalChipTextDark]} numberOfLines={1}>
                    ✈️ Airport
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TALK TO ORANGE CONCIERGE QUICK BAR */}
              <TouchableOpacity
                style={[styles.homeTalkBanner, theme === 'dark' && styles.homeTalkBannerDark]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTalkToOrangeVisible(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                  <View style={styles.homeTalkIconWrap}>
                    <Sparkles size={14} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.homeTalkTitle, theme === 'dark' && styles.textWhite]}>Talk to Orange</Text>
                      <View style={styles.homeTalkBadge}>
                        <Text style={styles.homeTalkBadgeText}>24x7 AI</Text>
                      </View>
                    </View>
                    <Text style={[styles.homeTalkSub, theme === 'dark' && styles.textMutedDark]} numberOfLines={1}>
                      Ask fares, airport rules, EV features or chat live
                    </Text>
                  </View>
                </View>
                <ChevronRight size={15} color="#F97316" />
              </TouchableOpacity>

              {/* INSIDE EVERY ORANGE - AMENITIES SHOWCASE BANNER */}
              <View style={[styles.homeAmenitiesBanner, theme === 'dark' && styles.homeAmenitiesBannerDark]}>
                <View style={styles.homeAmenitiesHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="#F97316" />
                    <Text style={[styles.homeAmenitiesTitle, theme === 'dark' && styles.textWhite]}>Inside Every Orange Ride</Text>
                  </View>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 2, paddingHorizontal: 4 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAmenitiesModalVisible(true);
                    }}
                  >
                    <Text style={styles.homeAmenitiesViewAll}>Perks</Text>
                    <ChevronRight size={13} color="#F97316" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  contentContainerStyle={styles.homeAmenitiesScroll}
                >
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>📺 In-Seat HD Screen</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🎵 Studio Acoustics</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>💧 Bottled Water</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>📰 Daily Papers</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>❄️ Pre-Cooled AC</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>⚡ BE.6 Luxury EV</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🔌 Type-C Chargers</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🛡️ Zero Surge Pricing</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🌿 100% Electric</Text>
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Floating Bottom Navigation Dock with Elevated Taxi FAB (Option B) */}
            <View
              style={[
                styles.floatingNavDock,
                theme === 'dark' && styles.floatingNavDockDark,
                { bottom: Math.max(insets.bottom, 12) },
              ]}
            >
              {/* Home Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('home');
                }}
              >
                <Navigation size={22} color={activeTab === 'home' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'home' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>

              {/* History Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('history');
                  setHistoryModalVisible(true);
                }}
              >
                <Clock size={22} color={activeTab === 'history' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'history' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>

              {/* Elevated Center Taxi FAB */}
              <TouchableOpacity
                style={[styles.navDockCenterFab, theme === 'dark' && styles.navDockCenterFabDark]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  if (currentResumableBooking) {
                    setActiveBooking(currentResumableBooking);
                    setPendingSearchBooking(null);
                    setStep(4);
                  } else if (dropLocation && dropLocation.name) {
                    setStep(2);
                  } else {
                    setSearchModalVisible(true);
                  }
                }}
              >
                <Car size={26} color="#FFFFFF" />
                {currentResumableBooking && <View style={styles.navDockActiveDot} />}
              </TouchableOpacity>

              {/* Talk to Orange / Concierge Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('chat');
                  setTalkToOrangeVisible(true);
                }}
              >
                <MessageSquare size={22} color={activeTab === 'chat' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'chat' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>

              {/* Settings / Profile Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('profile');
                  setProfileModalVisible(true);
                }}
              >
                <UserIcon size={22} color={activeTab === 'profile' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'profile' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* DEDICATED LOCATION SEARCH MODAL (UBER / OLA STYLE)                */}
        {/* ================================================================= */}
        <LocationSearchModal
          visible={searchModalVisible}
          topInset={insets.top}
          onClose={() => setSearchModalVisible(false)}
          pickupText={pickupText}
          pickupCoords={pickupCoords}
          dropLocation={dropLocation}
          onSelectPickup={(loc) => {
            setPickupText(loc.name);
            setPickupCoords({ lat: loc.lat, lng: loc.lng });
          }}
          onSelectDrop={(loc) => {
            setDropLocation(loc);
            setSearchModalVisible(false);
            setStep(2); // Jump directly to ride & vehicle selection
          }}
          onChooseOnMap={(target) => {
            setSearchModalVisible(false);
            setPinPickerTarget(target);
            setPinCurrentCoords(target === 'pickup' ? pickupCoords : (dropLocation ? { lat: dropLocation.lat, lng: dropLocation.lng } : pickupCoords));
            setPinAddressText(target === 'pickup' ? pickupText : (dropLocation?.name || 'Set destination on map'));
            setPinPickerActive(true);
          }}
          onUseCurrentGPS={() => refreshLocation(activeCity)}
          activeCity={activeCity}
          onChangeCity={(c) => {
            if (c !== 'All') {
              setActiveCity(c);
            }
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* IN-RIDE REALTIME CHAT MODAL                                       */}
        {/* ================================================================= */}
        {activeBooking && (
          <InRideChatModal
            visible={chatModalVisible}
            onClose={() => setChatModalVisible(false)}
            bookingId={activeBooking.id}
            bookingReference={activeBooking.reference || activeBooking.id.substring(0, 8)}
            driverName={assignedDriver?.full_name || 'Orange Chauffeur'}
            driverPhone={assignedDriver?.phone}
            customerName={user?.email?.split('@')[0] || 'Passenger'}
            currentUserLocation={pickupCoords}
            driverLocation={
              assignedDriver?.current_lat && assignedDriver?.current_lng
                ? { lat: assignedDriver.current_lat, lng: assignedDriver.current_lng }
                : null
            }
            onUnreadCountChange={(count) => setUnreadChatCount(count)}
          />
        )}

        {/* ================================================================= */}
        {/* POST-TRIP 5-STAR RATING & REVIEW MODAL                            */}
        {/* ================================================================= */}
        {activeBooking && (
          <RatingModal
            visible={ratingModalVisible}
            bookingId={activeBooking.id}
            driverId={assignedDriver?.id || activeBooking.driver_id}
            driverName={resolvedVehicle.chauffeurName}
            vehicleName={`${resolvedVehicle.modelName} (${resolvedVehicle.plateNumber})`}
            onRatingSubmitted={(newRating, totalRides) => {
              if (assignedDriver) {
                setAssignedDriver({
                  ...assignedDriver,
                  rating: newRating,
                  total_rides: totalRides,
                });
              }
            }}
            onDismiss={() => {
              setRatingModalVisible(false);
              setActiveBooking(null);
              setAssignedDriver(null);
              setStep(1);
            }}
            theme={theme}
          />
        )}

        {/* ================================================================= */}
        {/* RIDER PROFILE MODAL                                               */}
        {/* ================================================================= */}
        <ProfileModal
          visible={profileModalVisible}
          onDismiss={() => {
            setProfileModalVisible(false);
            setActiveTab('home');
          }}
          user={user}
          onSignOut={handleSignOut}
          onGuardianUpdated={(g) => setGuardianContact(g)}
          onSavedPlacesUpdated={(places) => {
            setSavedHomeAddress(places.home);
            setSavedWorkAddress(places.work);
          }}
          onOpenRideHistory={() => {
            setProfileModalVisible(false);
            setActiveTab('history');
            setHistoryModalVisible(true);
          }}
          onOpenAuth={() => {
            setProfileModalVisible(false);
            setAuthMode('signin');
            setAuthModalVisible(true);
          }}
          onOpenAmenities={() => {
            setProfileModalVisible(false);
            setAmenitiesModalVisible(true);
          }}
          onOpenTalkToOrange={() => {
            setProfileModalVisible(false);
            setTalkToOrangeVisible(true);
          }}
          walletBalance={walletBalance}
          theme={theme}
          onToggleTheme={(t) => handleToggleTheme()}
        />

        {/* ================================================================= */}
        {/* RIDE HISTORY MODAL (CONNECTED TO SUPABASE)                         */}
        {/* ================================================================= */}
        <RideHistoryModal
          visible={historyModalVisible}
          onClose={() => {
            setHistoryModalVisible(false);
            setActiveTab('home');
          }}
          user={user}
          onRepeatTrip={handleRepeatTrip}
          onResumeBooking={(booking) => {
            setHistoryModalVisible(false);
            setActiveTab('home');
            setActiveBooking(booking);
            setPendingSearchBooking(null);
            setStep(4);
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* IN-CAB AMENITIES & FACILITIES SHOWCASE MODAL                       */}
        {/* ================================================================= */}
        <AmenitiesModal
          visible={amenitiesModalVisible}
          onClose={() => setAmenitiesModalVisible(false)}
          onBookNow={() => {
            if (dropLocation && dropLocation.name) {
              setStep(2);
            } else {
              setSearchModalVisible(true);
            }
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* RIDE SCHEDULE MODAL                                               */}
        {/* ================================================================= */}
        <ScheduleModal
          visible={scheduleModalVisible}
          onClose={() => setScheduleModalVisible(false)}
          currentSchedule={scheduledDate}
          onConfirmSchedule={(date) => {
            setScheduledDate(date);
            setScheduleModalVisible(false);
          }}
          onClearSchedule={() => {
            setScheduledDate(null);
            setScheduleModalVisible(false);
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* GUARDIAN SAFETY SUITE MODAL                                       */}
        {/* ================================================================= */}
        <GuardianSafetyModal
          visible={guardianModalVisible}
          onDismiss={() => setGuardianModalVisible(false)}
          booking={activeBooking}
          driver={assignedDriver}
          guardian={guardianContact}
          onOpenGuardianSetup={() => setProfileModalVisible(true)}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* TALK TO ORANGE - 24x7 CONCIERGE & INTELLIGENT AI ASSISTANT MODAL  */}
        {/* ================================================================= */}
        <TalkToOrangeModal
          visible={talkToOrangeVisible}
          onClose={() => {
            setTalkToOrangeVisible(false);
            setActiveTab('home');
          }}
          topInset={insets.top}
          theme={theme}
          activeBooking={activeBooking}
          onOpenChauffeurChat={() => {
            setTalkToOrangeVisible(false);
            setChatModalVisible(true);
          }}
          onBookRide={(destinationName, coords) => {
            setTalkToOrangeVisible(false);
            if (destinationName && coords) {
              setDropLocation({
                id: `dest-${Date.now()}`,
                name: destinationName,
                subtitle: destinationName,
                lat: coords.lat,
                lng: coords.lng,
                city: activeCity,
                tag: '📍 Selected Place',
              });
              setStep(2);
            } else if (dropLocation && dropLocation.name) {
              setStep(2);
            } else {
              setSearchModalVisible(true);
            }
          }}
        />

        {/* ================================================================= */}
        {/* SUPABASE AUTH MODAL                                               */}
        {/* ================================================================= */}
        <Modal visible={authModalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBackdrop}
          >
            <View style={styles.authModalContent}>
              <View style={styles.authModalHeader}>
                <Text style={styles.authModalTitle}>
                  {authMode === 'signin' ? 'Sign In to Orange Taxi' : 'Create Orange Account'}
                </Text>
                <TouchableOpacity onPress={() => setAuthModalVisible(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.authModalSub}>
                {authMode === 'signin'
                  ? 'Access your ride history, saved trips and instant booking.'
                  : 'Join Orange Taxi for luxury electric travel across India.'}
              </Text>

              {authMode === 'signup' && (
                <>
                  <View style={styles.authField}>
                    <Text style={styles.authLabel}>Full Name</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="e.g. Akshat Gupta"
                      placeholderTextColor="#94A3B8"
                      value={authFullName}
                      onChangeText={setAuthFullName}
                    />
                  </View>
                  <View style={styles.authField}>
                    <Text style={styles.authLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={authPhone}
                      onChangeText={setAuthPhone}
                    />
                  </View>
                </>
              )}

              <View style={styles.authField}>
                <Text style={styles.authLabel}>Email Address</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="name@domain.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                />
              </View>

              <View style={styles.authField}>
                <Text style={styles.authLabel}>Password</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={authPassword}
                  onChangeText={setAuthPassword}
                />
              </View>

              <TouchableOpacity
                style={styles.authSubmitBtn}
                disabled={authSubmitting}
                onPress={handleAuthSubmit}
              >
                {authSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.authSubmitText}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authSwitchBtn}
                onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              >
                <Text style={styles.authSwitchText}>
                  {authMode === 'signin'
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },

  // -------------------------------------------------------------------------
  // FLOATING ISLAND HEADER (STEP 1 - OPTION B)
  // -------------------------------------------------------------------------
  floatingIslandHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
  },
  floatingAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F97316',
  },
  avatarChar: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: '800',
  },
  floatingWalletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  floatingWalletText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  walletSoonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  walletSoonBadgeText: {
    color: '#F97316',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  walletPlusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletPlusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  floatingCityBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  floatingCityMenu: {
    position: 'absolute',
    top: 56,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 6,
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 50,
  },
  cityMenuHeader: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cityMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cityMenuItemActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  cityMenuItemText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '600',
  },
  cityMenuItemTextActive: {
    color: '#F97316',
    fontWeight: '800',
  },

  // -------------------------------------------------------------------------
  // DARK VARIANT OVERRIDES — FLOATING ISLAND HEADER
  // -------------------------------------------------------------------------
  floatingAvatarBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  floatingWalletPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  floatingThemeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  floatingThemeBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  floatingCityBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  floatingCityMenuDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },

  // -------------------------------------------------------------------------
  // SHARED DARK / LIGHT TEXT UTILITIES
  // -------------------------------------------------------------------------
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
  containerDark: {
    backgroundColor: '#0B0F19',
  },

  // -------------------------------------------------------------------------
  // STEP 4 ARRIVING & IN-PROGRESS TOP BAR — DARK VARIANTS
  // -------------------------------------------------------------------------
  arrivingTopHeaderDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
  },
  arrivingBackBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  arrivingShieldBtnDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },

  // -------------------------------------------------------------------------
  // STEP 2 VEHICLE SELECTION HEADER — DARK VARIANTS
  // -------------------------------------------------------------------------
  step2HeaderDark: {
    backgroundColor: '#0B0F19',
    borderBottomColor: '#1E293B',
  },
  step2BackBtnDark: {
    backgroundColor: '#1E293B',
  },

  // -------------------------------------------------------------------------
  // PIN PICKER MODE — DARK VARIANTS
  // -------------------------------------------------------------------------
  pinPickerHeaderDark: {
    backgroundColor: '#0B0F19',
    borderBottomColor: '#1E293B',
  },
  pinPickerBackBtnDark: {
    backgroundColor: '#1E293B',
  },
  pinPickerBottomCardDark: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
  },

  // -------------------------------------------------------------------------
  // STEP 1 DESTINATION CARD & NAV DOCK — DARK VARIANTS
  // -------------------------------------------------------------------------
  minimalDestCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    shadowColor: '#000',
  },
  destOrangeHollowRingDark: {
    backgroundColor: '#0F172A',
  },
  destPinIconBtnDark: {
    backgroundColor: '#1E293B',
  },
  destConnectorLineDark: {
    backgroundColor: '#334155',
  },
  destCarIconBoxDark: {
    backgroundColor: 'transparent',
  },
  destPlaceholderTextDark: {
    color: '#64748B',
  },
  destSearchCircleDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.22)',
  },
  destScheduleBtnDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  minimalChipsRowDark: {
    borderTopColor: '#1E293B',
  },
  minimalChipDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  minimalChipTextDark: {
    color: '#CBD5E1',
  },
  homeAmenitiesBannerDark: {
    borderTopColor: '#1E293B',
  },
  homeAmenityPillDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  homeAmenityPillTextDark: {
    color: '#FB923C',
  },
  floatingNavDockDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    shadowColor: '#000',
  },
  navDockCenterFabDark: {
    borderColor: '#0F172A',
  },

  // -------------------------------------------------------------------------
  // STEP 2 RIDE SELECTION SHEET — DARK VARIANTS
  // -------------------------------------------------------------------------
  sheetScrollDark: {
    backgroundColor: '#0B0F19',
  },
  sheetRouteBarDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  sheetEditBtnDark: {
    backgroundColor: '#1E293B',
  },
  gateNoteBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  sheetFleetCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  sheetFleetCardActiveDark: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  sheetFleetIconBoxDark: {
    backgroundColor: '#1E293B',
  },
  step2AmenitiesCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  sheetHospitalityCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  climateChipDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  quietToggleDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  paymentChipDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  secondaryBackBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  departureCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  departureToggleBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  departureToggleBtnActiveDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#F97316',
  },

  // -------------------------------------------------------------------------
  // STEP 4 ARRIVING HUD — DARK VARIANTS
  // -------------------------------------------------------------------------
  floatingArrivingCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    shadowColor: '#000',
  },
  scheduledHudBoxDark: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  driverAvatarCircleDark: {
    backgroundColor: '#1E293B',
  },
  circularActionCancelDark: {
    backgroundColor: '#1E293B',
  },

  // -------------------------------------------------------------------------
  // STEP 4 ARRIVING & IN-PROGRESS TOP BAR
  // -------------------------------------------------------------------------
  arrivingTopHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
  },
  floatingBackCircleBtn: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 30,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  floatingBackCircleBtnDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    shadowColor: '#000',
  },
  arrivingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  arrivingHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  arrivingShieldBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  // -------------------------------------------------------------------------
  // STEP 2 VEHICLE SELECTION HEADER
  // -------------------------------------------------------------------------
  step2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 20,
  },
  step2BackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  step2HeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  step2HeaderSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F97316',
  },

  // -------------------------------------------------------------------------
  // STEP 1: FLOATING DESTINATION CARD & BOTTOM DOCK (OPTION B)
  // -------------------------------------------------------------------------
  minimalDestCard: {
    position: 'absolute',
    bottom: 84,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 20,
  },
  destStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  destOrangeHollowRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3.5,
    borderColor: '#F97316',
    backgroundColor: '#FFFFFF',
  },
  destCarIconBox: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destMicroLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destPrimaryAddress: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  destPlaceholderText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  destPinIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  destConnectorLine: {
    width: 2,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginLeft: 7,
    marginVertical: 2,
  },
  destSearchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 9,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    gap: 4,
    marginRight: 6,
  },
  destScheduleBtnActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  destScheduleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  destScheduleBtnTextActive: {
    color: '#FFFFFF',
  },
  minimalChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  minimalChip: {
    flex: 1,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
  },
  minimalChipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Home Talk to Orange Concierge Quick Bar
  homeTalkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.22)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
  },
  homeTalkBannerDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  homeTalkIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTalkTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  homeTalkBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  homeTalkBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F97316',
    textTransform: 'uppercase',
  },
  homeTalkSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },

  // Home Amenities Showcase Banner
  homeAmenitiesBanner: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  homeAmenitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  homeAmenitiesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  homeAmenitiesViewAll: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  homeAmenitiesScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  homeAmenityPill: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  homeAmenityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F97316',
  },

  // ── RESUME RIDE HOME CARD ──
  resumeRideHomeCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FB923C',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  resumeRideHomeCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#F97316',
    shadowColor: '#000',
  },
  resumeRideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  resumeRidePulseContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeRidePulseRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F97316',
  },
  resumeRidePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
  },
  resumeRideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  resumeRideSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  resumeRideActionBtn: {
    backgroundColor: '#F97316',
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 11,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  resumeRideActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  navDockActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Floating Navigation Dock
  floatingNavDock: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 25,
    paddingHorizontal: 12,
  },
  navDockItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeTabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F97316',
    marginTop: 4,
  },
  navDockCenterFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },

  // -------------------------------------------------------------------------
  // STEP 4: FLOATING ARRIVING HUD CARD (OPTION B)
  // -------------------------------------------------------------------------
  floatingArrivingCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 25,
  },
  arrivingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrivingTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.4,
  },
  arrivingSubSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  arrivingEtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  arrivingEtaText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '800',
  },
  searchingFleetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  searchingFleetText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  driverProfileMinimalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  driverAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F97316',
  },
  driverAvatarLetter: {
    color: '#F97316',
    fontSize: 20,
    fontWeight: '900',
  },
  driverMetaCol: {
    flex: 1,
    marginLeft: 12,
  },
  driverNameTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  partnerPill: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  partnerPillText: {
    color: '#F97316',
    fontSize: 9,
    fontWeight: '800',
  },
  vehicleModelSub: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  driverPillsRow: {
    alignItems: 'flex-end',
    gap: 5,
  },
  ratingPillYellow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingPillText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  platePillMono: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  platePillText: {
    color: '#18181B',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  circularActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  circularActionCancel: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularActionChat: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  chatBadgeAbsolute: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#18181B',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  circularActionCall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  inProgressPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inProgressPillText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
  },
  otpPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  otpPillLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  otpPillCode: {
    color: '#F97316',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  otpPillSub: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  searchingOtpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchingOtpText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    flex: 1,
  },
  onboardAmenitiesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
  },
  onboardAmenitiesText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
    flex: 1,
  },
  onboardAmenitiesViewText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
  },
  safetyStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  safetyStripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  safetyStripText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  bookingRefMicro: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },

  // -------------------------------------------------------------------------
  // STEP 2: RIDE SELECTION BOTTOM SHEET
  // -------------------------------------------------------------------------
  sheetScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetRouteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 10,
  },
  sheetRouteVisual: {
    width: 16,
    alignItems: 'center',
    marginRight: 10,
  },
  sheetGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  sheetLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  sheetOrangeDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  sheetRoutePickup: {
    color: '#6B7280',
    fontSize: 12,
  },
  sheetRouteDrop: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  sheetEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  sheetEditText: {
    color: '#F97316',
    fontSize: 11,
    fontWeight: '700',
  },
  gateNoteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  gateNoteInput: {
    color: '#111827',
    fontSize: 12,
    paddingVertical: 2,
  },
  sheetSectionTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sheetFleetList: {
    gap: 8,
    marginBottom: 14,
  },
  sheetFleetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  sheetFleetCardActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  sheetFleetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFleetName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetSeatsPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sheetSeatsText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  sheetFleetTagline: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  sheetFleetEta: {
    color: '#F97316',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  sheetFleetFare: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: '800',
  },
  sheetFleetPerKm: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  step2AmenitiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  step2AmenitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  step2AmenitiesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  freeTagBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeTagBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.4,
  },
  step2AmenitiesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  step2AmenityItem: {
    alignItems: 'center',
    flex: 1,
  },
  step2AmenityEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  step2AmenityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  step2AmenitiesFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step2AmenitiesFooterText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  step2AmenitiesDetailsLink: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F97316',
  },
  departureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  departureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  departureTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  departureResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  departureToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  departureToggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  departureToggleBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  departureToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  departureToggleTextActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  scheduledBannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FFF7ED',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  scheduledBannerInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C2410C',
    flex: 1,
  },
  sheetHospitalityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 14,
  },
  sheetHospitalityTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  climateRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  climateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  climateChipActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  climateChipText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  climateChipTextActive: {
    color: '#F97316',
    fontWeight: '700',
  },
  quietToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quietToggleActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  quietToggleTitle: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  quietToggleTitleActive: {
    color: '#F97316',
  },
  quietToggleSub: {
    color: '#6B7280',
    fontSize: 10,
  },
  quietCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietCheckboxActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  paymentChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentChipActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  paymentChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentChipTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  bookCtaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBackBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F97316',
    borderRadius: 14,
    height: 48,
  },
  bookPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scheduledHudBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 12,
    marginVertical: 10,
  },
  scheduledHudIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scheduledHudDateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
  },
  scheduledHudSubText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },


  // -------------------------------------------------------------------------
  // AUTH MODAL STYLES
  // -------------------------------------------------------------------------
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  authModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 38,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  authModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authModalTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  authModalSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  authField: {
    marginBottom: 14,
  },
  authLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  authInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  authSubmitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  authSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  authSwitchBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  authSwitchText: {
    color: '#64748B',
    fontSize: 13,
  },

  // -------------------------------------------------------------------------
  // PIN PICKER MODE STYLES
  // -------------------------------------------------------------------------
  pinPickerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pinPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pinPickerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPickerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  pinDropHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249, 115, 22, 0.2)',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  pinDropHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
    textAlign: 'center',
  },
  pinPickerBottomCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  pinAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinAddressMicro: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  pinAddressText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  pinConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pinConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
