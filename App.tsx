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
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  MapPin,
  Navigation,
  Car,
  Snowflake,
  VolumeX,
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
import { RideMap } from './src/components/RideMap';
import { InRideChatModal } from './src/components/InRideChatModal';
import { RatingModal } from './src/components/RatingModal';
import { LocationSearchModal } from './src/components/LocationSearchModal';
import {
  LocationItem,
  NearbyCab,
  getSanitizedLocation,
  generateNearbyCabs,
  EXPANDED_PRESETS,
  getDefaultCityCenter,
  searchPlaces,
  isCoordinateInIndia,
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
  const [dropLocation, setDropLocation] = useState<LocationItem>(
    EXPANDED_PRESETS.find((p) => p.city === 'Bengaluru') || EXPANDED_PRESETS[0]
  );
  const [pickupPillar, setPickupPillar] = useState('');
  const [nearbyCabs, setNearbyCabs] = useState<NearbyCab[]>([]);

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

  // In-Ride Chat & Post-Ride Rating Modals
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

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

    initApp();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update nearby simulated cabs whenever pickup coordinates change
  useEffect(() => {
    if (pickupCoords.lat && pickupCoords.lng) {
      setNearbyCabs(generateNearbyCabs(pickupCoords.lat, pickupCoords.lng));
    }
  }, [pickupCoords.lat, pickupCoords.lng]);

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
            (loc) => {
              if (isCoordinateInIndia(loc.coords.latitude, loc.coords.longitude)) {
                setPickupCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
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
  }, []);

  // Fetch driver details whenever driver_id is assigned
  useEffect(() => {
    const driverId = activeBooking?.driver_id;
    if (!driverId) {
      setAssignedDriver(null);
      return;
    }

    async function fetchDriver() {
      const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .maybeSingle();

      if (data) {
        setAssignedDriver(data as Driver);
      }
    }

    fetchDriver();

    const driverChannel = supabase
      .channel(`driver-loc-${driverId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` },
        (payload: any) => {
          if (payload.new) {
            setAssignedDriver((prev: any) => (prev ? { ...prev, ...payload.new } : payload.new));
          }
        }
      )
      .subscribe();

    return () => {
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

    // Pick top preset matching that city as default drop
    const matchingDrop = EXPANDED_PRESETS.find((p) => p.city === locResult.cityName);
    if (matchingDrop) {
      setDropLocation(matchingDrop);
    }
  }

  // Handle City Switch from Quick Header Dropdown
  function handleSelectCity(city: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad') {
    Haptics.selectionAsync();
    setActiveCity(city);
    setCityPickerVisible(false);

    const defaultHub = getDefaultCityCenter(city, false);
    setPickupCoords({ lat: defaultHub.lat, lng: defaultHub.lng });
    setPickupText(defaultHub.displayText);

    const matchingDrop = EXPANDED_PRESETS.find((p) => p.city === city && p.isAirport) ||
      EXPANDED_PRESETS.find((p) => p.city === city) ||
      EXPANDED_PRESETS[0];

    setDropLocation(matchingDrop);
  }

  // Handle 1-Tap Map Press to adjust pickup point anywhere on map
  async function handleHomeMapPress(coords: { lat: number; lng: number }) {
    if (step !== 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickupCoords(coords);
    try {
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      if (geo) {
        const parts: string[] = [];
        if (geo.name && geo.name !== geo.street) parts.push(geo.name);
        if (geo.street) parts.push(geo.street);
        if (geo.district && !parts.includes(geo.district)) parts.push(geo.district);
        const locality = parts.length > 0 ? parts.join(', ') : 'Selected Point';
        const city = geo.city || geo.subregion || activeCity;
        setPickupText(`${locality}, ${city}`);
      }
    } catch (e) {
      setPickupText(`Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    }
  }

  // Distance & Fare Calculations
  const rawDist = haversine(pickupCoords.lat, pickupCoords.lng, dropLocation.lat, dropLocation.lng);
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

        if (statusChanged || driverChanged) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (newBooking.status === 'completed') {
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
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      if (geo) {
        const street = geo.street || geo.name || 'Selected Location';
        const city = geo.city || geo.district || 'India';
        setPinAddressText(`${street}, ${city}`);
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBookingLoading(true);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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
      setStep(4);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Booking Notice', err.message || 'Connecting to fleet...');
    } finally {
      setBookingLoading(false);
    }
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0D11" />

        {/* TOP BRAND & CITY SELECTOR HEADER */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoChar}>O</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>ORANGE TAXI</Text>
              <Text style={styles.brandSubtitle}>100% ELECTRIC MOBILITY</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Quick City Switcher Dropdown Button */}
            {step === 1 && !pinPickerActive && (
              <TouchableOpacity
                style={styles.citySelectorBtn}
                onPress={() => setCityPickerVisible(!cityPickerVisible)}
              >
                <MapPin size={11} color="#F56B00" />
                <Text style={styles.citySelectorText}>{activeCity}</Text>
                <ChevronDown size={12} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {/* Auth Profile / Sign In Pill */}
            {user ? (
              <TouchableOpacity style={styles.userProfilePill} onPress={handleSignOut}>
                <UserIcon size={12} color="#F56B00" />
                <Text style={styles.userProfileText} numberOfLines={1}>
                  {user.email?.split('@')[0]}
                </Text>
                <LogOut size={12} color="#9CA3AF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => {
                  setAuthMode('signin');
                  setAuthModalVisible(true);
                }}
              >
                <UserIcon size={12} color="#FFFFFF" />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CITY SELECTION POPUP DRAWER */}
        {cityPickerVisible && (
          <View style={styles.cityDropdownMenu}>
            {(['Delhi NCR', 'Bengaluru', 'Mumbai', 'Hyderabad'] as const).map((city) => (
              <TouchableOpacity
                key={city}
                style={[styles.cityDropdownItem, activeCity === city && styles.cityDropdownItemActive]}
                onPress={() => handleSelectCity(city)}
              >
                <Text style={[styles.cityDropdownItemText, activeCity === city && styles.cityDropdownItemTextActive]}>
                  {city}
                </Text>
                {activeCity === city && <Check size={14} color="#F56B00" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

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
                <ArrowLeft size={20} color="#FFFFFF" />
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
          <ScrollView contentContainerStyle={styles.activeRideScroll}>
            <View style={styles.activeCard}>
              <View style={styles.statusHeader}>
                <View style={[styles.pulsingDot, !assignedDriver && styles.pulsingDotAmber]} />
                <Text style={[styles.statusTitle, !assignedDriver && styles.statusTitleAmber]}>
                  {activeBooking.status === 'searching'
                    ? 'Broadcasting to nearby Orange Chauffeurs...'
                    : activeBooking.status === 'accepted'
                    ? 'Chauffeur En Route 📍'
                    : activeBooking.status === 'arrived'
                    ? 'Chauffeur Arrived at your Pickup'
                    : activeBooking.status === 'in_progress'
                    ? 'Ride in Progress · En Route to Drop ⚡'
                    : 'Ride Completed'}
                </Text>
              </View>

              {/* LIVE MAP TRACKING */}
              <View style={{ marginTop: 14 }}>
                <RideMap
                  pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: activeBooking.pickup_area }}
                  drop={{ lat: dropLocation.lat, lng: dropLocation.lng, name: activeBooking.drop_area }}
                  driverLocation={
                    assignedDriver?.current_lat && assignedDriver?.current_lng
                      ? { lat: assignedDriver.current_lat, lng: assignedDriver.current_lng }
                      : null
                  }
                  status={activeBooking.status}
                  height={220}
                  routeDistanceKm={activeBooking.distance_km}
                  routeDurationMin={activeBooking.duration_min}
                />
              </View>

              {/* OTP HERO SECTION */}
              <View style={styles.otpHero}>
                <Text style={styles.otpLabel}>YOUR RIDE START OTP</Text>
                <Text style={styles.otpValue}>{activeBooking.ride_otp}</Text>
                <Text style={styles.otpSub}>Share this 6-digit code with your driver to begin the journey</Text>
              </View>

              {/* Trip Reference & Fare */}
              <View style={styles.tripMetaRow}>
                <View>
                  <Text style={styles.metaLabel}>Booking Reference</Text>
                  <Text style={styles.metaValue}>{activeBooking.reference}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.metaLabel}>Guaranteed Fare</Text>
                  <Text style={styles.metaFare}>₹{activeBooking.estimated_fare}</Text>
                </View>
              </View>

              {/* Route Summary */}
              <View style={styles.routeBox}>
                <View style={styles.routeStop}>
                  <View style={styles.greenDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopLabel}>PICKUP LOCATION</Text>
                    <Text style={styles.stopName}>{activeBooking.pickup_area}</Text>
                  </View>
                </View>
                <View style={styles.routeConnector} />
                <View style={styles.routeStop}>
                  <View style={styles.orangeDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopLabel}>DESTINATION</Text>
                    <Text style={styles.stopName}>{activeBooking.drop_area}</Text>
                  </View>
                </View>
              </View>

              {/* DYNAMIC CHAUFFEUR CARD */}
              {assignedDriver ? (
                <View style={styles.carAssignedCard}>
                  <Car size={24} color="#F56B00" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.carName}>{assignedDriver.full_name}</Text>
                    <Text style={styles.carPlate}>
                      {assignedDriver.vehicle_model || activeBooking.vehicle_name} · {assignedDriver.vehicle_number}
                    </Text>
                    <Text style={styles.driverSubText}>
                      ⭐ {assignedDriver.rating?.toFixed(1) || '4.9'} · {assignedDriver.total_rides || 1} rides completed
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.carSearchingCard}>
                  <Radio size={22} color="#F59E0B" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.searchingTitle}>Awaiting Chauffeur Acceptance</Text>
                    <Text style={styles.searchingSub}>
                      Requested: {activeBooking.vehicle_name}. Driver details and vehicle plate will update automatically.
                    </Text>
                  </View>
                </View>
              )}

              {/* Dual Action Buttons (In-Ride Chat & Call) */}
              <View style={styles.dualCommRow}>
                <TouchableOpacity
                  style={styles.chatChauffeurBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setChatModalVisible(true);
                  }}
                >
                  <MessageSquare size={16} color="#FFFFFF" />
                  <Text style={styles.chatChauffeurText}>In-Ride Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.callChauffeurBtnDual}
                  onPress={() => {
                    const phone = assignedDriver?.phone || '+911140007000';
                    Linking.openURL(`tel:${phone}`);
                  }}
                >
                  <Phone size={16} color="#FFFFFF" />
                  <Text style={styles.callChauffeurText}>Call Chauffeur</Text>
                </TouchableOpacity>
              </View>

              {/* Guardian Shield Card */}
              <View style={styles.guardianShieldCard}>
                <ShieldCheck size={18} color="#22C55E" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.guardianTitle}>Orange Guardian Shield Active</Text>
                  <Text style={styles.guardianSub}>GPS & telemetry monitored 24x7 by Safety Operations Control</Text>
                </View>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRide}>
                <X size={16} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Cancel Ride (Fee Exempt)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : step === 2 ? (
          /* =============================================================== */
          /* STEP 2: RIDE SELECTION & ROUTE REVIEW (UBER/OLA STYLE SHEET)     */
          /* =============================================================== */
          <View style={{ flex: 1 }}>
            {/* Top Route Map */}
            <View style={{ height: height * 0.33 }}>
              <RideMap
                pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: pickupText }}
                drop={{ lat: dropLocation.lat, lng: dropLocation.lng, name: dropLocation.name }}
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
                    {dropLocation.name}
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
          <View style={{ flex: 1 }}>
            {/* Full Screen Interactive Map with Nearby Cabs */}
            <View style={{ flex: 1 }}>
              <RideMap
                pickup={pickupCoords}
                nearbyCabs={nearbyCabs}
                interactive={true}
                height="100%"
                onMapPress={handleHomeMapPress}
                onRecenterPress={() => refreshLocation(activeCity)}
              />
            </View>

            {/* Bottom "Where to?" Card & Popular Places */}
            <View style={styles.homeBottomCard}>
              {/* Interactive Current Pickup Point Bar (Tap to edit or set pin) */}
              <View style={styles.homePickupRow}>
                <TouchableOpacity
                  style={styles.homePickupBar}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSearchModalVisible(true);
                  }}
                >
                  <View style={styles.pickupLivePulse}>
                    <View style={styles.pickupLiveDot} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.pickupMicroText}>CURRENT PICKUP POINT</Text>
                      <Text style={styles.pickupTapToEditText}>Tap to edit ✎</Text>
                    </View>
                    <Text style={styles.pickupTitleText} numberOfLines={1}>
                      {pickupText}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.setPinShortcutBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setPinPickerTarget('pickup');
                    setPinCurrentCoords(pickupCoords);
                    setPinAddressText(pickupText);
                    setPinPickerActive(true);
                  }}
                >
                  <MapIcon size={16} color="#F56B00" />
                </TouchableOpacity>
              </View>

              {/* Uber-Style "Where to?" Search Bar */}
              <TouchableOpacity
                style={styles.whereToBar}
                activeOpacity={0.9}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchModalVisible(true);
                }}
              >
                <View style={styles.whereToSearchIcon}>
                  <Search size={18} color="#F56B00" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.whereToPlaceholder}>Where to?</Text>
                  <Text style={styles.whereToSub}>Airport, CyberHub, Tech Parks, Metro...</Text>
                </View>
                <View style={styles.whereToArrowBadge}>
                  <ChevronRight size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              {/* Quick Hub Filter Chips */}
              <View style={styles.quickChipsRow}>
                {[
                  { tag: '✈️ Airport', query: 'Airport' },
                  { tag: '💼 Tech Park', query: 'Tech Park' },
                  { tag: '🚇 Metro Hub', query: 'Metro' },
                  { tag: '🛍️ Mall', query: 'Mall' },
                ].map(({ tag, query }) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.quickChip}
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
                    <Text style={styles.quickChipText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Popular Transit Hubs in Active City */}
              <View style={styles.popularHubsSection}>
                <Text style={styles.popularHubsTitle}>POPULAR IN {activeCity.toUpperCase()}</Text>
                {popularHubs.map((hub) => (
                  <TouchableOpacity
                    key={hub.id}
                    style={styles.popularHubItem}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDropLocation(hub);
                      setStep(2);
                    }}
                  >
                    <View style={styles.popularHubIconBox}>
                      <MapPin size={16} color="#F56B00" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.popularHubName} numberOfLines={1}>
                        {hub.name}
                      </Text>
                      <Text style={styles.popularHubSub} numberOfLines={1}>
                        {hub.subtitle}
                      </Text>
                    </View>
                    <ChevronRight size={14} color="#6B7280" />
                  </TouchableOpacity>
                ))}
              </View>
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
            setPinCurrentCoords(target === 'pickup' ? pickupCoords : { lat: dropLocation.lat, lng: dropLocation.lng });
            setPinAddressText(target === 'pickup' ? pickupText : dropLocation.name);
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
            driverName={assignedDriver?.full_name || 'Orange Chauffeur'}
            customerName={user?.email?.split('@')[0] || 'Passenger'}
          />
        )}

        {/* ================================================================= */}
        {/* POST-TRIP 5-STAR RATING & REVIEW MODAL                            */}
        {/* ================================================================= */}
        {activeBooking && (
          <RatingModal
            visible={ratingModalVisible}
            bookingId={activeBooking.id}
            driverName={assignedDriver?.full_name || 'Orange Chauffeur'}
            vehicleName={activeBooking.vehicle_name}
            onDismiss={() => {
              setRatingModalVisible(false);
              setActiveBooking(null);
              setAssignedDriver(null);
              setStep(1);
            }}
          />
        )}

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
                  <X size={20} color="#9CA3AF" />
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
                      placeholderTextColor="#6B7280"
                      value={authFullName}
                      onChangeText={setAuthFullName}
                    />
                  </View>
                  <View style={styles.authField}>
                    <Text style={styles.authLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#6B7280"
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
                  placeholderTextColor="#6B7280"
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
                  placeholderTextColor="#6B7280"
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
    backgroundColor: '#0B0D11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0B0D11',
    borderBottomWidth: 1,
    borderBottomColor: '#1A202C',
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChar: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    color: '#F56B00',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  citySelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#161A23',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232A36',
  },
  citySelectorText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  cityDropdownMenu: {
    position: 'absolute',
    top: 55,
    right: 70,
    backgroundColor: '#1E232F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
    paddingVertical: 4,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  cityDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  cityDropdownItemActive: {
    backgroundColor: 'rgba(245, 107, 0, 0.1)',
  },
  cityDropdownItemText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  cityDropdownItemTextActive: {
    color: '#F56B00',
    fontWeight: '700',
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161A23',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232A36',
  },
  userProfileText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F56B00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0D11',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 12,
  },

  // -------------------------------------------------------------------------
  // HOME SCREEN (STEP 1)
  // -------------------------------------------------------------------------
  homeBottomCard: {
    backgroundColor: '#12151C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#1E232F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  homePickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  homePickupBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A23',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232A38',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickupLivePulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  pickupMicroText: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pickupTapToEditText: {
    color: '#F56B00',
    fontSize: 10,
    fontWeight: '700',
  },
  pickupTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  setPinShortcutBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1B202B',
    borderWidth: 1,
    borderColor: '#293244',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whereToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B202B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#293244',
    padding: 12,
  },
  whereToSearchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whereToPlaceholder: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  whereToSub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  whereToArrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#1A1F2A',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252D3D',
  },
  quickChipText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  popularHubsSection: {
    borderTopWidth: 1,
    borderTopColor: '#1A202C',
    paddingTop: 12,
  },
  popularHubsTitle: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  popularHubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#161A22',
  },
  popularHubIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularHubName: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  popularHubSub: {
    color: '#9CA3AF',
    fontSize: 11,
  },

  // -------------------------------------------------------------------------
  // STEP 2: RIDE SELECTION BOTTOM SHEET
  // -------------------------------------------------------------------------
  sheetScroll: {
    flex: 1,
    backgroundColor: '#101319',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetRouteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232936',
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
    backgroundColor: '#374151',
    marginVertical: 2,
  },
  sheetOrangeDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#F56B00',
  },
  sheetRoutePickup: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  sheetRouteDrop: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sheetEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#232A38',
  },
  sheetEditText: {
    color: '#F56B00',
    fontSize: 11,
    fontWeight: '700',
  },
  gateNoteBox: {
    backgroundColor: '#151821',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#202633',
    marginBottom: 14,
  },
  gateNoteInput: {
    color: '#D1D5DB',
    fontSize: 12,
    paddingVertical: 2,
  },
  sheetSectionTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: '#171B24',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#232936',
    padding: 12,
  },
  sheetFleetCardActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.08)',
  },
  sheetFleetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E232F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFleetName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetSeatsPill: {
    backgroundColor: '#252B3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sheetSeatsText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  sheetFleetEta: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sheetFleetFare: {
    color: '#F56B00',
    fontSize: 16,
    fontWeight: '800',
  },
  sheetFleetPerKm: {
    color: '#6B7280',
    fontSize: 10,
  },
  sheetHospitalityCard: {
    backgroundColor: '#171B24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232936',
    padding: 12,
    marginBottom: 14,
  },
  sheetHospitalityTitle: {
    color: '#9CA3AF',
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
    backgroundColor: '#1D222E',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3344',
  },
  climateChipActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.1)',
  },
  climateChipText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  climateChipTextActive: {
    color: '#F56B00',
    fontWeight: '700',
  },
  quietToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1E29',
    padding: 10,
    borderRadius: 8,
  },
  quietToggleActive: {
    backgroundColor: 'rgba(245, 107, 0, 0.08)',
  },
  quietToggleTitle: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  quietToggleTitleActive: {
    color: '#F56B00',
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
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietCheckboxActive: {
    backgroundColor: '#F56B00',
    borderColor: '#F56B00',
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
    backgroundColor: '#171B24',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232936',
  },
  paymentChipActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.08)',
  },
  paymentChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentChipTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#1E232F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  bookPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F56B00',
    borderRadius: 14,
    height: 48,
  },
  bookPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // -------------------------------------------------------------------------
  // PIN PICKER MODE
  // -------------------------------------------------------------------------
  pinPickerContainer: {
    flex: 1,
    backgroundColor: '#0B0D11',
  },
  pinPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0B0D11',
    borderBottomWidth: 1,
    borderBottomColor: '#1A202C',
  },
  pinPickerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E232F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPickerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pinPickerBottomCard: {
    backgroundColor: '#12151C',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#1E232F',
  },
  pinAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  pinAddressMicro: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  pinAddressText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  pinConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F56B00',
    paddingVertical: 12,
    borderRadius: 12,
  },
  pinConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // -------------------------------------------------------------------------
  // STEP 4: ACTIVE RIDE CARD STYLES
  // -------------------------------------------------------------------------
  activeRideScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 40,
  },
  activeCard: {
    backgroundColor: '#13161F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#232936',
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  pulsingDotAmber: {
    backgroundColor: '#F59E0B',
  },
  statusTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '700',
  },
  statusTitleAmber: {
    color: '#F59E0B',
  },
  otpHero: {
    backgroundColor: '#1B202C',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2A3345',
  },
  otpLabel: {
    color: '#F56B00',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  otpValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 8,
    marginVertical: 4,
  },
  otpSub: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
  },
  tripMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#171B24',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  metaLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  metaFare: {
    color: '#F56B00',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  routeBox: {
    backgroundColor: '#171B24',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  orangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F56B00',
  },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: '#374151',
    marginLeft: 3,
    marginVertical: 3,
  },
  stopLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stopName: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  carAssignedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B202B',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#263041',
  },
  carName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  carPlate: {
    color: '#F56B00',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  driverSubText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  carSearchingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B202B',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#263041',
  },
  searchingTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  searchingSub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  dualCommRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  chatChauffeurBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E232F',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  chatChauffeurText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  callChauffeurBtnDual: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22C55E',
    paddingVertical: 11,
    borderRadius: 12,
  },
  callChauffeurText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  guardianShieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  guardianTitle: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
  },
  guardianSub: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#141822',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: '#232936',
  },
  authModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authModalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  authModalSub: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  authField: {
    marginBottom: 12,
  },
  authLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
  },
  authInput: {
    backgroundColor: '#1C212D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3546',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  authSubmitBtn: {
    backgroundColor: '#F56B00',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  authSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  authSwitchBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  authSwitchText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
