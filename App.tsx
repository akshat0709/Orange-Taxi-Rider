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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

export default function App() {
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

  // Hospitality Comforts
  const [cabinClimate, setCabinClimate] = useState<'chilled' | 'pleasant' | 'eco'>('chilled');
  const [quietRide, setQuietRide] = useState(false);

  // Payment & Fare
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);

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
  const [walletBalance, setWalletBalance] = useState<number>(250);

  // -------------------------------------------------------------------------
  // INITIALIZATION & AUTH LISTENER
  // -------------------------------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkActiveRide(session.user.id);
      }
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

  async function checkActiveRide(userId: string) {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', userId)
        .in('status', ['searching', 'accepted', 'arrived', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveBooking(data as Booking);
        setStep(4);
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
  // BOOKING SUBMISSION TO SUPABASE
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBookingLoading(true);

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const ref = 'OT' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const effectivePickup = pickupPillar ? `${pickupText} (${pickupPillar})` : pickupText;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          reference: ref,
          pickup_area: effectivePickup,
          pickup_address: `${pickupCoords.lat},${pickupCoords.lng}`,
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
          status: 'searching',
        })
        .select('*')
        .single();

      if (error) {
        console.error('DB insert error:', error);
        Alert.alert('Booking Error', `Database error: ${error.message}`);
        return;
      }

      setActiveBooking(data as Booking);
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
      setStep(4);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Booking Notice', err.message || 'Connecting to fleet...');
    } finally {
      setBookingLoading(false);
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
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ================================================================= */}
        {/* FLOATING TOP HEADERS (OPTION B MINIMAL DESIGN)                    */}
        {/* ================================================================= */}
        {pinPickerActive ? null : step === 1 ? (
          /* STEP 1: FLOATING ISLAND HEADER */
          <View style={styles.floatingIslandHeader}>
            {/* User Profile Avatar Circle */}
            <TouchableOpacity
              style={styles.floatingAvatarBtn}
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
                <UserIcon size={19} color="#18181B" />
              )}
            </TouchableOpacity>

            {/* Floating Wallet Pill [ 💳  ₹ 250   + ] */}
            <TouchableOpacity
              style={styles.floatingWalletPill}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert(
                  'Orange Electric Wallet',
                  `Current Available Balance: ₹${walletBalance}\n\n100% Zero-Emission Travel. Instant auto-pay enabled.`,
                  [
                    {
                      text: 'Add ₹500',
                      onPress: () => {
                        setWalletBalance((b) => b + 500);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      },
                    },
                    { text: 'Close', style: 'cancel' },
                  ]
                );
              }}
            >
              <CreditCard size={15} color="#18181B" />
              <Text style={styles.floatingWalletText}>₹ {walletBalance}</Text>
              <View style={styles.walletPlusCircle}>
                <Text style={styles.walletPlusText}>+</Text>
              </View>
            </TouchableOpacity>

            {/* City Switcher Circular Button */}
            <TouchableOpacity
              style={styles.floatingCityBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                setCityPickerVisible(!cityPickerVisible);
              }}
            >
              <MapPin size={18} color="#F97316" />
            </TouchableOpacity>

            {/* Floating City Dropdown Menu */}
            {cityPickerVisible && (
              <View style={styles.floatingCityMenu}>
                <Text style={styles.cityMenuHeader}>SELECT CITY</Text>
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
          <View style={styles.arrivingTopHeader}>
            <TouchableOpacity
              style={styles.arrivingBackBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep(1);
              }}
            >
              <ArrowLeft size={18} color="#18181B" />
            </TouchableOpacity>

            <Text style={styles.arrivingHeaderTitle}>
              {activeBooking?.status === 'in_progress'
                ? 'Ride in Progress'
                : activeBooking?.status === 'arrived'
                ? 'Chauffeur Arrived'
                : activeBooking?.status === 'accepted'
                ? 'Arriving'
                : 'Connecting'}
            </Text>

            <TouchableOpacity
              style={styles.arrivingShieldBtn}
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
          <View style={styles.step2Header}>
            <TouchableOpacity
              style={styles.step2BackBtn}
              activeOpacity={0.85}
              onPress={() => setStep(1)}
            >
              <ArrowLeft size={18} color="#18181B" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.step2HeaderTitle}>Select Ride</Text>
              <Text style={styles.step2HeaderSub}>100% Zero-Emission EV Fleet</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        ) : null}

        {/* ================================================================= */}
        {/* VIEW ROUTER                                                       */}
        {/* ================================================================= */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#F56B00" />
            <Text style={styles.loadingText}>Initializing Orange Electric Fleet...</Text>
          </View>
        ) : pinPickerActive ? (
          /* =============================================================== */
          /* PIN PICKER MODE ("SET ON MAP")                                  */
          /* =============================================================== */
          <View style={styles.pinPickerContainer}>
            <View style={styles.pinPickerHeader}>
              <TouchableOpacity
                style={styles.pinPickerBackBtn}
                onPress={() => setPinPickerActive(false)}
              >
                <ArrowLeft size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.pinPickerTitle}>
                Set {pinPickerTarget === 'pickup' ? 'Pickup Location' : 'Destination'} on Map
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Full Screen Map with fixed Center Pin */}
            <View style={{ flex: 1 }}>
              <RideMap
                pickup={pinCurrentCoords}
                interactive={true}
                height="100%"
                isPinPickerMode={true}
                pinPickerTarget={pinPickerTarget}
                onPinLocationChange={handlePinRegionChange}
              />
            </View>

            {/* Bottom Confirmation Card */}
            <View style={styles.pinPickerBottomCard}>
              <View style={styles.pinAddressRow}>
                <MapPin size={18} color="#F56B00" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.pinAddressMicro}>PINPOINTED LOCATION</Text>
                  <Text style={styles.pinAddressText} numberOfLines={2}>
                    {pinAddressText}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.pinConfirmBtn} onPress={handleConfirmPinPicker}>
                <Text style={styles.pinConfirmText}>Confirm Location</Text>
                <ArrowRight size={16} color="#FFFFFF" />
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
              />
            </View>

            {/* Floating Minimal Arriving HUD Card (Option B) */}
            <View style={styles.floatingArrivingCard}>
              {/* Header: Title + ETA badge */}
              <View style={styles.arrivingCardHeader}>
                <View>
                  <Text style={styles.arrivingTitleText}>
                    {activeBooking.status === 'in_progress'
                      ? 'In Progress'
                      : activeBooking.status === 'arrived'
                      ? 'Arrived'
                      : activeBooking.status === 'accepted'
                      ? 'Arriving'
                      : 'Connecting'}
                  </Text>
                  <Text style={styles.arrivingSubSubtitle}>
                    {activeBooking.status === 'in_progress'
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
                    {activeBooking.status === 'in_progress'
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
              {activeBooking.status === 'searching' ? (
                <View style={styles.searchingFleetRow}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={styles.searchingFleetText}>
                    Broadcasting to nearby Orange EV Chauffeurs...
                  </Text>
                </View>
              ) : (
                <View style={styles.driverProfileMinimalRow}>
                  {/* Driver Avatar */}
                  <View style={styles.driverAvatarCircle}>
                    <Text style={styles.driverAvatarLetter}>
                      {resolvedVehicle.chauffeurName.charAt(0) || 'D'}
                    </Text>
                  </View>

                  {/* Driver & Car Meta */}
                  <View style={styles.driverMetaCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.driverNameTitle} numberOfLines={1}>
                        {resolvedVehicle.chauffeurName}
                      </Text>
                      {resolvedVehicle.isPartner && (
                        <View style={styles.partnerPill}>
                          <Text style={styles.partnerPillText}>Partner</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.vehicleModelSub} numberOfLines={1}>
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
                    style={styles.circularActionCancel}
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

              {/* Ride Start OTP Pill (or Verified Status) */}
              {activeBooking.status === 'in_progress' ? (
                <View style={styles.inProgressPillBar}>
                  <CheckCircle size={15} color="#10B981" />
                  <Text style={styles.inProgressPillText}>OTP Verified · Fare ₹{activeBooking.estimated_fare}</Text>
                </View>
              ) : activeBooking.ride_otp ? (
                <View style={styles.otpPillBar}>
                  <Text style={styles.otpPillLabel}>START OTP</Text>
                  <Text style={styles.otpPillCode}>{activeBooking.ride_otp}</Text>
                  <Text style={styles.otpPillSub}>Share with chauffeur</Text>
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
            <View style={{ height: height * 0.33 }}>
              <RideMap
                pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: pickupText }}
                drop={dropLocation ? { lat: dropLocation.lat, lng: dropLocation.lng, name: dropLocation.name } : undefined}
                interactive={true}
                height="100%"
                routeDistanceKm={distKm}
                routeDurationMin={durationMin}
              />
            </View>

            {/* Bottom Swipeable Booking Sheet */}
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {/* Pickup -> Destination Bar (Tap to re-edit anytime) */}
              <TouchableOpacity
                style={styles.sheetRouteBar}
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
                  <Text style={styles.sheetRouteDrop} numberOfLines={1}>
                    {dropLocation ? dropLocation.name : 'Select drop-off destination'}
                  </Text>
                </View>
                <View style={styles.sheetEditBtn}>
                  <Text style={styles.sheetEditText}>Edit</Text>
                </View>
              </TouchableOpacity>

              {/* Optional Airport / Metro Pickup Gate Note */}
              <View style={styles.gateNoteBox}>
                <TextInput
                  style={styles.gateNoteInput}
                  placeholder="Pillar / Gate / Landmark (e.g. Pillar 3, Gate 4)"
                  placeholderTextColor="#6B7280"
                  value={pickupPillar}
                  onChangeText={setPickupPillar}
                />
              </View>

              {/* VEHICLE FLEET SELECTION LIST */}
              <Text style={styles.sheetSectionTitle}>CHOOSE YOUR ELECTRIC RIDE</Text>
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
                      style={[styles.sheetFleetCard, isSel && styles.sheetFleetCardActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedVehicle(v);
                      }}
                    >
                      <View style={styles.sheetFleetIconBox}>
                        <Car size={22} color={isSel ? '#F56B00' : '#CBD5E1'} />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.sheetFleetName}>{v.name}</Text>
                          <View style={styles.sheetSeatsPill}>
                            <Text style={styles.sheetSeatsText}>{v.seats} Seats</Text>
                          </View>
                        </View>
                        <Text style={styles.sheetFleetTagline} numberOfLines={1}>
                          {v.tagline || (v.code === 'ORANGE_SEDAN' ? 'Mahindra BE.6 Luxury EV' : v.code === 'ORANGE_XL' ? '6-Seater Electric SUV' : 'Tata Tiago Smart EV')}
                        </Text>
                        <Text style={styles.sheetFleetEta}>
                          {v.code === 'ORANGE_SEDAN' ? '⚡ 3 min away · Most Popular' : '⚡ 4-5 min away'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.sheetFleetFare}>₹{vTotal}</Text>
                        <Text style={styles.sheetFleetPerKm}>₹{v.per_km}/km</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* INCLUDED IN-CAB AMENITIES CARD */}
              <TouchableOpacity
                style={styles.step2AmenitiesCard}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAmenitiesModalVisible(true);
                }}
              >
                <View style={styles.step2AmenitiesHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#F97316" />
                    <Text style={styles.step2AmenitiesTitle}>Included With Your {selectedVehicle?.name || 'Ride'}</Text>
                  </View>
                  <View style={styles.freeTagBadge}>
                    <Text style={styles.freeTagBadgeText}>100% INCLUDED</Text>
                  </View>
                </View>

                <View style={styles.step2AmenitiesGrid}>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>📺</Text>
                    <Text style={styles.step2AmenityText}>In-Seat Screen</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>🎵</Text>
                    <Text style={styles.step2AmenityText}>Studio Audio</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>💧</Text>
                    <Text style={styles.step2AmenityText}>Bottled Water</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>📰</Text>
                    <Text style={styles.step2AmenityText}>Daily Papers</Text>
                  </View>
                </View>

                <View style={styles.step2AmenitiesFooter}>
                  <Text style={styles.step2AmenitiesFooterText}>Pre-cooled AC · Clean EV · Zero surge guarantee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={styles.step2AmenitiesDetailsLink}>Details</Text>
                    <ChevronRight size={12} color="#F97316" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* SIGNATURE HOSPITALITY PREFERENCES */}
              <View style={styles.sheetHospitalityCard}>
                <Text style={styles.sheetHospitalityTitle}>SIGNATURE COMFORT</Text>

                <View style={styles.climateRow}>
                  {[
                    { id: 'chilled', label: 'Chilled (19°C)' },
                    { id: 'pleasant', label: 'Pleasant (22°C)' },
                    { id: 'eco', label: 'Eco AC (24°C)' },
                  ].map(({ id, label }) => (
                    <TouchableOpacity
                      key={id}
                      style={[styles.climateChip, cabinClimate === id && styles.climateChipActive]}
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
                  style={[styles.quietToggle, quietRide && styles.quietToggleActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setQuietRide(!quietRide);
                  }}
                >
                  <VolumeX size={16} color={quietRide ? '#F56B00' : '#9CA3AF'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.quietToggleTitle, quietRide && styles.quietToggleTitleActive]}>
                      Quiet Ride Mode
                    </Text>
                    <Text style={styles.quietToggleSub}>Chauffeur will keep conversation minimal</Text>
                  </View>
                  <View style={[styles.quietCheckbox, quietRide && styles.quietCheckboxActive]}>
                    {quietRide && <Check size={10} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              </View>

              {/* PAYMENT METHOD SELECTOR */}
              <View style={styles.paymentMethodRow}>
                <TouchableOpacity
                  style={[styles.paymentChip, paymentMethod === 'cash' && styles.paymentChipActive]}
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
                  style={[styles.paymentChip, paymentMethod === 'upi' && styles.paymentChipActive]}
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
                  style={styles.secondaryBackBtn}
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
                        Book {selectedVehicle?.name || 'Ride'} · ₹{totalEstimatedFare}
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
              />
            </View>

            {/* Floating Minimal Two-Stop Destination Card (Option B) */}
            <View style={styles.minimalDestCard}>
              {/* Pickup Row: "Where are you?" */}
              <TouchableOpacity
                style={styles.destStopRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchModalVisible(true);
                }}
              >
                <View style={styles.destOrangeHollowRing} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.destMicroLabel}>Where are you?</Text>
                  <Text style={styles.destPrimaryAddress} numberOfLines={1}>
                    {pickupText}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.destPinIconBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setPinPickerTarget('pickup');
                    setPinCurrentCoords(pickupCoords);
                    setPinAddressText(pickupText);
                    setPinPickerActive(true);
                  }}
                >
                  <MapIcon size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Vertical connector line */}
              <View style={styles.destConnectorLine} />

              {/* Destination Row: "Where you want to go?" */}
              <TouchableOpacity
                style={styles.destStopRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchModalVisible(true);
                }}
              >
                <View style={styles.destCarIconBox}>
                  <Car size={16} color="#18181B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.destMicroLabel}>Pick Off</Text>
                  <Text
                    style={dropLocation ? styles.destPrimaryAddress : styles.destPlaceholderText}
                    numberOfLines={1}
                  >
                    {dropLocation ? dropLocation.name : 'Where you want to go?'}
                  </Text>
                </View>
                <View style={styles.destSearchCircle}>
                  <Search size={15} color="#F97316" />
                </View>
              </TouchableOpacity>

              {/* Quick Filter Chips */}
              <View style={styles.minimalChipsRow}>
                {[
                  { label: '✈️ Airport', query: 'Airport' },
                  { label: '💼 Work / Tech Park', query: 'Tech Park' },
                  { label: '🛍️ Mall', query: 'Mall' },
                ].map(({ label, query }) => (
                  <TouchableOpacity
                    key={label}
                    style={styles.minimalChip}
                    onPress={async () => {
                      Haptics.selectionAsync();
                      const matches = await searchPlaces(query, activeCity, pickupCoords);
                      if (matches.length > 0) {
                        setDropLocation(matches[0]);
                        setStep(2);
                      } else {
                        setSearchModalVisible(true);
                      }
                    }}
                  >
                    <Text style={styles.minimalChipText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* INSIDE EVERY ORANGE - AMENITIES SHOWCASE BANNER */}
              <TouchableOpacity
                style={styles.homeAmenitiesBanner}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAmenitiesModalVisible(true);
                }}
              >
                <View style={styles.homeAmenitiesHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="#F97316" />
                    <Text style={styles.homeAmenitiesTitle}>Inside Every Orange Ride</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={styles.homeAmenitiesViewAll}>Perks</Text>
                    <ChevronRight size={13} color="#F97316" />
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.homeAmenitiesScroll}
                >
                  <View style={styles.homeAmenityPill}>
                    <Text style={styles.homeAmenityPillText}>📺 In-Seat HD Screen</Text>
                  </View>
                  <View style={styles.homeAmenityPill}>
                    <Text style={styles.homeAmenityPillText}>🎵 Studio Acoustics</Text>
                  </View>
                  <View style={styles.homeAmenityPill}>
                    <Text style={styles.homeAmenityPillText}>💧 Bottled Water</Text>
                  </View>
                  <View style={styles.homeAmenityPill}>
                    <Text style={styles.homeAmenityPillText}>📰 Daily Papers</Text>
                  </View>
                  <View style={styles.homeAmenityPill}>
                    <Text style={styles.homeAmenityPillText}>❄️ Pre-Cooled AC</Text>
                  </View>
                  <View style={styles.homeAmenityPill}>
                    <Text style={styles.homeAmenityPillText}>⚡ BE.6 Luxury EV</Text>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </View>

            {/* Floating Bottom Navigation Dock with Elevated Taxi FAB (Option B) */}
            <View style={styles.floatingNavDock}>
              {/* Home Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('home');
                }}
              >
                <Navigation size={22} color={activeTab === 'home' ? '#F97316' : '#9CA3AF'} />
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
                <Clock size={22} color={activeTab === 'history' ? '#F97316' : '#9CA3AF'} />
                {activeTab === 'history' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>

              {/* Elevated Center Taxi FAB */}
              <TouchableOpacity
                style={styles.navDockCenterFab}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  if (dropLocation && dropLocation.name) {
                    setStep(2);
                  } else {
                    setSearchModalVisible(true);
                  }
                }}
              >
                <Car size={26} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Chat Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('chat');
                  if (activeBooking) {
                    setChatModalVisible(true);
                  } else {
                    Alert.alert(
                      '24x7 Orange Support',
                      'Our 24x7 customer support & concierge line is always available for assistance.',
                      [
                        { text: 'Call Concierge', onPress: () => Linking.openURL('tel:1800123456') },
                        { text: 'Close', style: 'cancel' }
                      ]
                    );
                  }
                }}
              >
                <MessageSquare size={22} color={activeTab === 'chat' ? '#F97316' : '#9CA3AF'} />
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
                <UserIcon size={22} color={activeTab === 'profile' ? '#F97316' : '#9CA3AF'} />
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
          walletBalance={walletBalance}
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
                  ? 'Access your ride telemetry, saved trips and instant booking.'
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
      </SafeAreaView>
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
    top: Platform.OS === 'ios' ? 12 : 14,
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
  // STEP 4 ARRIVING & IN-PROGRESS TOP BAR
  // -------------------------------------------------------------------------
  arrivingTopHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
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
    backgroundColor: '#F8FAFC',
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  minimalChipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
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
