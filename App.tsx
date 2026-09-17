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
  Copy,
  AlertTriangle,
  RotateCcw,
  User as UserIcon,
  LogOut,
  Mail,
  Lock,
} from 'lucide-react-native';
import { supabase } from './src/lib/supabase';
import { VehicleCategory, Booking, Driver } from './src/types';
import { ALL_PRESETS, PresetLocation } from './src/lib/presets';
import { RideMap } from './src/components/RideMap';

const { width } = Dimensions.get('window');

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
  // Stepper: 1: Choose vehicle, 2: Journey details, 3: Confirm, 4: Active Ride
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Vehicle data
  const [vehicles, setVehicles] = useState<VehicleCategory[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory | null>(null);
  const [loading, setLoading] = useState(true);

  // City filter for presets
  const [activeCity, setActiveCity] = useState<'All' | 'Bengaluru' | 'Delhi NCR' | 'Mumbai' | 'Hyderabad'>('All');

  // Locations
  const [pickupText, setPickupText] = useState('Locating GPS...');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9784, lng: 77.6408 });
  const [dropLocation, setDropLocation] = useState<PresetLocation>(ALL_PRESETS[0]);
  const [pickupPillar, setPickupPillar] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Hospitality Comforts
  const [cabinClimate, setCabinClimate] = useState<'chilled' | 'pleasant' | 'eco'>('chilled');
  const [quietRide, setQuietRide] = useState(false);

  // Payment & Fare
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    // 1. Listen for Supabase auth state changes
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

  // Fetch real driver details whenever activeBooking driver_id changes
  useEffect(() => {
    const driverId = activeBooking?.driver_id;
    if (!driverId) {
      setAssignedDriver(null);
      return;
    }

    async function fetchDriver() {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .maybeSingle();

      if (data) {
        setAssignedDriver(data as Driver);
      }
    }

    fetchDriver();

    // Subscribe to live driver updates (GPS location broadcasting from Driver Console)
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

  // Check if the user already has an active ride in progress
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
          { id: '1', code: 'ORANGE_GO', name: 'Orange Go', tagline: 'Economy electric hatchback for everyday city rides', seats: 4, base_fare: 49, per_km: 12, minimum_fare: 99, sort_order: 1 },
          { id: '2', code: 'ORANGE_SEDAN', name: 'Orange Sedan', tagline: 'Mahindra BE.6 Premium electric SUV with extra comfort', seats: 4, base_fare: 59, per_km: 15, minimum_fare: 129, sort_order: 2 },
          { id: '3', code: 'ORANGE_XL', name: 'Orange XL', tagline: 'Six to seven seater for groups, luggage and airport runs', seats: 6, base_fare: 79, per_km: 20, minimum_fare: 179, sort_order: 3 },
        ];
        setVehicles(defaults);
        setSelectedVehicle(defaults[1]);
      }

      // 2. Request GPS Location
      acquireGPSLocation();
    } catch (e) {
      console.warn('Init error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function acquireGPSLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setPickupCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geo) {
          const street = geo.street || geo.name || geo.district || 'Current Location';
          const city = geo.city || geo.subregion || 'Metro Area';
          setPickupText(`${street}, ${city}`);

          if (city.toLowerCase().includes('bengaluru') || city.toLowerCase().includes('bangalore')) {
            setActiveCity('Bengaluru');
            setDropLocation(ALL_PRESETS.find(p => p.city === 'Bengaluru') || ALL_PRESETS[0]);
          } else if (city.toLowerCase().includes('delhi') || city.toLowerCase().includes('gurugram') || city.toLowerCase().includes('noida')) {
            setActiveCity('Delhi NCR');
            setDropLocation(ALL_PRESETS.find(p => p.city === 'Delhi NCR') || ALL_PRESETS[9]);
          } else if (city.toLowerCase().includes('mumbai')) {
            setActiveCity('Mumbai');
            setDropLocation(ALL_PRESETS.find(p => p.city === 'Mumbai') || ALL_PRESETS[17]);
          }
        } else {
          setPickupText('Current GPS Location');
        }
      } else {
        setPickupText('Indiranagar 100ft Road, Bengaluru');
        setPickupCoords({ lat: 12.9784, lng: 77.6408 });
      }
    } catch (err) {
      setPickupText('Indiranagar 100ft Road, Bengaluru');
      setPickupCoords({ lat: 12.9784, lng: 77.6408 });
    }
  }

  // Distance calculation
  const rawDist = haversine(pickupCoords.lat, pickupCoords.lng, dropLocation.lat, dropLocation.lng);
  const distKm = Math.max(2.5, Math.round(rawDist * 10) / 10);
  const durationMin = Math.round(distKm / 0.45);

  // Fare calculations exactly matching the website formula
  const baseFare = selectedVehicle?.base_fare || 59;
  const perKm = selectedVehicle?.per_km || 15;
  const minFare = selectedVehicle?.minimum_fare || 129;
  const distanceFare = Math.round(perKm * distKm);
  const preTax = Math.max(minFare, baseFare + distanceFare);
  const taxAmount = Math.round(preTax * 0.05); // 5% GST
  const platformFee = 0;
  const totalEstimatedFare = preTax + taxAmount + platformFee;

  // Realtime subscription for active ride updates from Driver Console / Admin
  useEffect(() => {
    if (!activeBooking?.id) return;

    const channel = supabase
      .channel(`booking-${activeBooking.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${activeBooking.id}` },
        (payload: any) => {
          if (payload.new) {
            setActiveBooking((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBooking?.id]);

  /* ========================================================================= */
  /* AUTHENTICATION HANDLERS                                                   */
  /* ========================================================================= */
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
        Alert.alert('Welcome Back!', `Signed in as ${data.user.email}`);
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
          setAuthModalVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Welcome to Orange Taxi!', 'Your account has been created successfully.');
        }
      }
    } catch (err: any) {
      Alert.alert('Authentication Notice', err.message || 'Could not complete request.');
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
    Alert.alert('Signed Out', 'You have been signed out.');
  }

  /* ========================================================================= */
  /* REAL BOOKING SUBMISSION TO SUPABASE                                       */
  /* ========================================================================= */
  async function handleConfirmBooking() {
    // 1. Require Authentication first
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
          customer_id: user.id, // Mandatory RLS foreign key
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
        console.error('Real DB insert error:', error);
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

  function handleCancelRide() {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this trip? Zero cancellation fee applies.', [
      { text: 'Keep Ride', style: 'cancel' },
      {
        text: 'Cancel Ride',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (activeBooking?.id) {
            await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', activeBooking.id);
          }
          setActiveBooking(null);
          setAssignedDriver(null);
          setStep(1);
        },
      },
    ]);
  }

  // Filter presets based on city & search query
  const filteredPresets = ALL_PRESETS.filter((p) => {
    const matchesCity = activeCity === 'All' || p.city === activeCity;
    const matchesQuery =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesQuery;
  });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0D11" />

        {/* Website Branded Header with Real Auth State */}
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

          {/* User Profile / Sign In Pill */}
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

        {/* Step Indicator */}
        {step !== 4 && (
          <View style={styles.stepperContainer}>
            <View style={styles.stepperRow}>
              {[
                { s: 1, label: 'Choose vehicle' },
                { s: 2, label: 'Journey details' },
                { s: 3, label: 'Confirm' },
              ].map(({ s, label }, i) => (
                <React.Fragment key={s}>
                  <TouchableOpacity
                    style={styles.stepItem}
                    disabled={s > step}
                    onPress={() => setStep(s as any)}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        step === s && styles.stepCircleActive,
                        step > s && styles.stepCircleCompleted,
                      ]}
                    >
                      {step > s ? (
                        <Check size={12} color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.stepNumber,
                            step === s && styles.stepNumberActive,
                          ]}
                        >
                          {s}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        step === s && styles.stepLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                  {i < 2 && <ChevronRight size={14} color="#374151" />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#F56B00" />
            <Text style={styles.loadingText}>Loading Orange Fleet...</Text>
          </View>
        ) : step === 4 && activeBooking ? (
          /* ========================================================================= */
          /* STEP 4: ACTIVE RIDE & LIVE DATABASE STATUS                                */
          /* ========================================================================= */
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
                    ? 'Ride in Progress ⚡'
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
                  height={200}
                />
              </View>

              {/* OTP Hero Section */}
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
                /* Driver IS Assigned from Supabase */
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
                /* Waiting for Driver to Accept */
                <View style={styles.carSearchingCard}>
                  <Radio size={22} color="#F59E0B" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.searchingTitle}>Awaiting Chauffeur Acceptance</Text>
                    <Text style={styles.searchingSub}>
                      Requested: {activeBooking.vehicle_name}. Driver details and registration plate will appear the moment a driver accepts.
                    </Text>
                  </View>
                </View>
              )}

              {/* Call Chauffeur Button */}
              {assignedDriver?.phone ? (
                <TouchableOpacity
                  style={styles.callChauffeurBtn}
                  onPress={() => Linking.openURL(`tel:${assignedDriver.phone}`)}
                >
                  <Phone size={16} color="#FFFFFF" />
                  <Text style={styles.callChauffeurText}>Call Chauffeur ({assignedDriver.phone})</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.callChauffeurBtn}
                  onPress={() => Linking.openURL('tel:+911140007000')}
                >
                  <Phone size={16} color="#FFFFFF" />
                  <Text style={styles.callChauffeurText}>Call 24x7 Fleet Hotline (+91 11 4000 7000)</Text>
                </TouchableOpacity>
              )}

              {/* Guardian Safety Badge */}
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
        ) : step === 1 ? (
          /* ========================================================================= */
          /* STEP 1: CHOOSE VEHICLE                                                    */
          /* ========================================================================= */
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.heroBanner}>
              <Text style={styles.heroMicro}>FOR PASSENGERS</Text>
              <Text style={styles.heroTitle}>Every ride,{'\n'}taken care of.</Text>
              <Text style={styles.heroDesc}>
                Premium electric car, professional driver, complimentary water — designed to make every journey feel a little better.
              </Text>
            </View>

            <Text style={styles.stepSectionTitle}>SELECT YOUR VEHICLE</Text>

            <View style={styles.vehiclesList}>
              {vehicles.map((v) => {
                const isSelected = selectedVehicle?.code === v.code;

                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedVehicle(v);
                    }}
                  >
                    <View style={styles.vehicleTopRow}>
                      <View style={styles.vehicleIconCircle}>
                        <Car size={22} color={isSelected ? '#F56B00' : '#9CA3AF'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.vehicleTitle}>{v.name}</Text>
                          <View style={styles.seatPill}>
                            <Text style={styles.seatPillText}>{v.seats} Seats</Text>
                          </View>
                        </View>
                        <Text style={styles.vehicleTagline}>{v.tagline}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.vehicleRate}>₹{v.per_km}/km</Text>
                        <Text style={styles.vehicleMinFare}>Min ₹{v.minimum_fare}</Text>
                      </View>
                    </View>

                    <View style={styles.vehicleSpecsRow}>
                      <View style={styles.specItem}>
                        <CheckCircle size={12} color="#22C55E" />
                        <Text style={styles.specText}>100% Electric</Text>
                      </View>
                      <View style={styles.specItem}>
                        <CheckCircle size={12} color="#22C55E" />
                        <Text style={styles.specText}>Air Conditioned</Text>
                      </View>
                      <View style={styles.specItem}>
                        <CheckCircle size={12} color="#22C55E" />
                        <Text style={styles.specText}>Free Water</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Proceed Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStep(2);
              }}
            >
              <Text style={styles.actionButtonText}>Journey Details</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        ) : step === 2 ? (
          /* ========================================================================= */
          /* STEP 2: JOURNEY DETAILS, MAP & PAN-INDIA PRESETS                          */
          /* ========================================================================= */
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* INTERACTIVE ROUTE MAP */}
            <RideMap
              pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: pickupText }}
              drop={{ lat: dropLocation.lat, lng: dropLocation.lng, name: dropLocation.name }}
              height={190}
            />

            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>PICKUP & DROP LOCATIONS</Text>

              {/* Current GPS Pickup Row */}
              <View style={styles.locationInputRow}>
                <View style={styles.greenCircle}>
                  <MapPin size={14} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputMicroLabel}>PICKUP LOCATION</Text>
                    <TouchableOpacity onPress={acquireGPSLocation} style={styles.refreshGpsBtn}>
                      <RotateCcw size={10} color="#F56B00" />
                      <Text style={styles.refreshGpsText}>Update GPS</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.locationMainText}>{pickupText}</Text>
                </View>
              </View>

              {/* Optional Airport / Metro Pickup Pillar */}
              <View style={styles.pillarInputBox}>
                <TextInput
                  style={styles.pillarTextInput}
                  placeholder="Airport Pillar / Gate / Landmark (e.g. Pillar 3, Gate 4)"
                  placeholderTextColor="#6B7280"
                  value={pickupPillar}
                  onChangeText={setPickupPillar}
                />
              </View>

              <View style={styles.cardDivider} />

              {/* Destination Row */}
              <View style={styles.locationInputRow}>
                <View style={styles.orangeCircle}>
                  <Navigation size={14} color="#F56B00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputMicroLabel}>SELECTED DESTINATION</Text>
                  <Text style={styles.locationMainText}>{dropLocation.name}</Text>
                  <Text style={styles.dropCityTag}>{dropLocation.city}</Text>
                </View>
              </View>
            </View>

            {/* City Tabs Selector (Pan-India) */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>SELECT DESTINATION CITY & HUBS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityTabsScroll}>
                {(['All', 'Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityTab, activeCity === c && styles.cityTabActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveCity(c);
                    }}
                  >
                    <Text style={[styles.cityTabText, activeCity === c && styles.cityTabTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Search Bar for Locations */}
              <View style={styles.searchBox}>
                <Search size={14} color="#9CA3AF" />
                <TextInput
                  style={styles.searchTextInput}
                  placeholder={`Search places in ${activeCity === 'All' ? 'India' : activeCity}...`}
                  placeholderTextColor="#6B7280"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Preset Destination Chips */}
              <View style={styles.presetsGrid}>
                {filteredPresets.map((p) => {
                  const isSel = dropLocation.name === p.name;
                  return (
                    <TouchableOpacity
                      key={p.name}
                      style={[styles.presetCard, isSel && styles.presetCardActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDropLocation(p);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.presetTag, isSel && styles.presetTagActive]}>{p.tag}</Text>
                        <Text style={styles.presetCityBadge}>{p.city}</Text>
                      </View>
                      <Text style={[styles.presetName, isSel && styles.presetNameActive]} numberOfLines={2}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Hospitality & Ride Preferences */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>SIGNATURE HOSPITALITY & COMFORT</Text>

              <Text style={styles.comfortHeading}>Pre-Cooled Cabin Temperature</Text>
              <View style={styles.climateRow}>
                {[
                  { id: 'chilled', label: 'Chilled (19°C)', icon: Snowflake },
                  { id: 'pleasant', label: 'Pleasant (22°C)', icon: Snowflake },
                  { id: 'eco', label: 'Eco AC (24°C)', icon: Snowflake },
                ].map(({ id, label, icon: Icon }) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.climateOption, cabinClimate === id && styles.climateOptionActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCabinClimate(id as any);
                    }}
                  >
                    <Icon size={14} color={cabinClimate === id ? '#F56B00' : '#9CA3AF'} />
                    <Text style={[styles.climateLabel, cabinClimate === id && styles.climateLabelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quiet Mode */}
              <TouchableOpacity
                style={[styles.quietModeToggle, quietRide && styles.quietModeToggleActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setQuietRide(!quietRide);
                }}
              >
                <VolumeX size={18} color={quietRide ? '#F56B00' : '#9CA3AF'} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.quietModeTitle, quietRide && styles.quietModeTitleActive]}>
                    Quiet Ride Mode
                  </Text>
                  <Text style={styles.quietModeSub}>Silent chauffeur — no unprompted conversation</Text>
                </View>
                <View style={[styles.checkboxCircle, quietRide && styles.checkboxCircleActive]}>
                  {quietRide && <Check size={12} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>

              <View style={styles.inclusionNotice}>
                <CheckCircle size={14} color="#22C55E" />
                <Text style={styles.inclusionText}>
                  Complimentary chilled water bottles & daily newspaper in every cab
                </Text>
              </View>
            </View>

            {/* Stepper Buttons */}
            <View style={styles.dualButtonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryNextBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep(3);
                }}
              >
                <Text style={styles.primaryNextText}>Confirm Ride</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        ) : (
          /* ========================================================================= */
          /* STEP 3: CONFIRM RIDE & ITEMIZED FARE BREAKDOWN                            */
          /* ========================================================================= */
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>TRIP OVERVIEW</Text>

              <View style={styles.summaryRoute}>
                <View style={styles.summaryStop}>
                  <View style={styles.greenDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryStopLabel}>PICKUP</Text>
                    <Text style={styles.summaryStopText}>{pickupText}</Text>
                    {pickupPillar ? <Text style={styles.pillarBadge}>Pillar: {pickupPillar}</Text> : null}
                  </View>
                </View>
                <View style={styles.summaryLine} />
                <View style={styles.summaryStop}>
                  <View style={styles.orangeDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryStopLabel}>DESTINATION</Text>
                    <Text style={styles.summaryStopText}>{dropLocation.name}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metaBadgeRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>DISTANCE</Text>
                  <Text style={styles.metaPillValue}>{distKm} km</Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>EST. TIME</Text>
                  <Text style={styles.metaPillValue}>~{durationMin} min</Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>VEHICLE</Text>
                  <Text style={styles.metaPillValue}>{selectedVehicle?.name}</Text>
                </View>
              </View>
            </View>

            {/* Itemized Fare Breakdown */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>ITEMIZED FARE BREAKDOWN</Text>

              <View style={styles.fareRow}>
                <Text style={styles.fareItemLabel}>Base Fare</Text>
                <Text style={styles.fareItemVal}>₹{baseFare}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareItemLabel}>Distance Rate ({distKm} km × ₹{perKm})</Text>
                <Text style={styles.fareItemVal}>₹{distanceFare}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareItemLabel}>GST (5% CGST + SGST · SAC 996412)</Text>
                <Text style={styles.fareItemVal}>₹{taxAmount}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareItemLabel}>Platform & Booking Fee</Text>
                <Text style={styles.fareItemGreen}>₹0 (Waived)</Text>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.totalFareRow}>
                <View>
                  <Text style={styles.totalFareLabel}>GUARANTEED TOTAL FARE</Text>
                  <Text style={styles.totalFareSub}>Zero surge · What you see is what you pay</Text>
                </View>
                <Text style={styles.totalFareAmount}>₹{totalEstimatedFare}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>PAYMENT METHOD</Text>

              <View style={styles.paymentOptionsRow}>
                <TouchableOpacity
                  style={[styles.paymentMethodCard, paymentMethod === 'cash' && styles.paymentMethodCardActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod('cash');
                  }}
                >
                  <Banknote size={20} color={paymentMethod === 'cash' ? '#F56B00' : '#9CA3AF'} />
                  <Text style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.paymentMethodTextActive]}>
                    Cash on Arrival
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paymentMethodCard, paymentMethod === 'upi' && styles.paymentMethodCardActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod('upi');
                  }}
                >
                  <CreditCard size={20} color={paymentMethod === 'upi' ? '#F56B00' : '#9CA3AF'} />
                  <Text style={[styles.paymentMethodText, paymentMethod === 'upi' && styles.paymentMethodTextActive]}>
                    UPI / QR Code
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Zero Cancellation Policy Guarantee */}
            <View style={styles.exemptionCard}>
              <CheckCircle size={18} color="#22C55E" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.exemptionTitle}>Statutory Zero Cancellation Fee</Text>
                <Text style={styles.exemptionSub}>
                  No cancellation penalties if your flight is delayed or plans change.
                </Text>
              </View>
            </View>

            {/* Stepper Buttons */}
            <View style={styles.dualButtonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRideBtn}
                disabled={bookingLoading}
                onPress={handleConfirmBooking}
              >
                {bookingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.confirmRideText}>
                      {user ? `Book Ride · ₹${totalEstimatedFare}` : 'Sign In & Book'}
                    </Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        )}

        {/* ========================================================================= */}
        /* AUTHENTICATION MODAL                                                      */
        /* ========================================================================= */
        <Modal
          visible={authModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAuthModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.brandRow}>
                  <View style={styles.logoBadgeSmall}>
                    <Text style={styles.logoCharSmall}>O</Text>
                  </View>
                  <Text style={styles.modalTitle}>
                    {authMode === 'signin' ? 'Sign In to Orange' : 'Create Rider Account'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAuthModalVisible(false)}>
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Mode Toggle */}
              <View style={styles.authToggleRow}>
                <TouchableOpacity
                  style={[styles.authToggleBtn, authMode === 'signin' && styles.authToggleBtnActive]}
                  onPress={() => setAuthMode('signin')}
                >
                  <Text style={[styles.authToggleText, authMode === 'signin' && styles.authToggleTextActive]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authToggleBtn, authMode === 'signup' && styles.authToggleBtnActive]}
                  onPress={() => setAuthMode('signup')}
                >
                  <Text style={[styles.authToggleText, authMode === 'signup' && styles.authToggleTextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Inputs */}
              {authMode === 'signup' && (
                <>
                  <View style={styles.authInputGroup}>
                    <Text style={styles.authLabel}>FULL NAME</Text>
                    <TextInput
                      style={styles.authTextInput}
                      placeholder="e.g. Akshat Gupta"
                      placeholderTextColor="#6B7280"
                      value={authFullName}
                      onChangeText={setAuthFullName}
                    />
                  </View>
                  <View style={styles.authInputGroup}>
                    <Text style={styles.authLabel}>PHONE NUMBER</Text>
                    <TextInput
                      style={styles.authTextInput}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="#6B7280"
                      keyboardType="phone-pad"
                      value={authPhone}
                      onChangeText={setAuthPhone}
                    />
                  </View>
                </>
              )}

              <View style={styles.authInputGroup}>
                <Text style={styles.authLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.authTextInput}
                  placeholder="you@example.com"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                />
              </View>

              <View style={styles.authInputGroup}>
                <Text style={styles.authLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.authTextInput}
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
                    {authMode === 'signin' ? 'Sign In to Account' : 'Create & Continue'}
                  </Text>
                )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoChar: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 13,
  },
  brandSubtitle: {
    color: '#9CA3AF',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E2330',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 130,
  },
  userProfileText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 70,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F56B00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Stepper */
  stepperContainer: {
    backgroundColor: '#12161F',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: '#F56B00',
    backgroundColor: '#F56B00',
  },
  stepCircleCompleted: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E',
  },
  stepNumber: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#FFFFFF',
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },

  /* Hero Banner */
  heroBanner: {
    backgroundColor: '#141820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232936',
    padding: 18,
    marginBottom: 16,
  },
  heroMicro: {
    color: '#F56B00',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
    marginVertical: 6,
  },
  heroDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  stepSectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },

  /* Vehicle Cards */
  vehiclesList: {
    gap: 12,
    marginBottom: 16,
  },
  vehicleCard: {
    backgroundColor: '#141820',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#232936',
  },
  vehicleCardActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.06)',
  },
  vehicleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F1218',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  seatPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  seatPillText: {
    color: '#D1D5DB',
    fontSize: 10,
    fontWeight: '600',
  },
  vehicleTagline: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  vehicleRate: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  vehicleMinFare: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  vehicleSpecsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2430',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  specText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },

  /* Cards */
  sectionCard: {
    backgroundColor: '#141820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232936',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greenCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orangeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputMicroLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
  },
  refreshGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshGpsText: {
    color: '#F56B00',
    fontSize: 10,
    fontWeight: '700',
  },
  locationMainText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  pillarInputBox: {
    marginTop: 8,
    marginLeft: 40,
  },
  pillarTextInput: {
    backgroundColor: '#0F1218',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#232936',
  },
  dropCityTag: {
    color: '#F56B00',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1F2430',
    marginVertical: 12,
  },

  /* City Tabs */
  cityTabsScroll: {
    marginBottom: 12,
  },
  cityTab: {
    backgroundColor: '#0F1218',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#232936',
  },
  cityTabActive: {
    backgroundColor: '#F56B00',
    borderColor: '#F56B00',
  },
  cityTabText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  cityTabTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F1218',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#232936',
    marginBottom: 12,
  },
  searchTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  presetsGrid: {
    gap: 8,
  },
  presetCard: {
    backgroundColor: '#0F1218',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#232936',
  },
  presetCardActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.08)',
  },
  presetTag: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  presetTagActive: {
    color: '#F56B00',
  },
  presetCityBadge: {
    color: '#6B7280',
    fontSize: 10,
  },
  presetName: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  presetNameActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Comfort */
  comfortHeading: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  climateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  climateOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0F1218',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#232936',
  },
  climateOptionActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.1)',
  },
  climateLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  climateLabelActive: {
    color: '#F56B00',
  },
  quietModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1218',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#232936',
  },
  quietModeToggleActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.06)',
  },
  quietModeTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quietModeTitleActive: {
    color: '#F56B00',
  },
  quietModeSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleActive: {
    borderColor: '#F56B00',
    backgroundColor: '#F56B00',
  },
  inclusionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    padding: 10,
    borderRadius: 8,
  },
  inclusionText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '500',
  },

  /* Buttons */
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F56B00',
    paddingVertical: 15,
    borderRadius: 14,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  dualButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  backButton: {
    width: 90,
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#D1D5DB',
    fontWeight: '700',
    fontSize: 14,
  },
  primaryNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F56B00',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryNextText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  /* Step 3 Confirm Styles */
  summaryRoute: {
    paddingVertical: 4,
  },
  summaryStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  summaryStopLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
  },
  summaryStopText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  pillarBadge: {
    color: '#F56B00',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryLine: {
    width: 2,
    height: 16,
    backgroundColor: '#2D3748',
    marginLeft: 4,
    marginVertical: 4,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2430',
  },
  metaPill: {
    alignItems: 'center',
  },
  metaPillLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
  },
  metaPillValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  fareItemLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  fareItemVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  fareItemGreen: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  totalFareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalFareLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  totalFareSub: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  totalFareAmount: {
    color: '#F56B00',
    fontSize: 24,
    fontWeight: '900',
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F1218',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#232936',
  },
  paymentMethodCardActive: {
    borderColor: '#F56B00',
    backgroundColor: 'rgba(245, 107, 0, 0.08)',
  },
  paymentMethodText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  exemptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141820',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    marginBottom: 16,
  },
  exemptionTitle: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '700',
  },
  exemptionSub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  confirmRideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F56B00',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmRideText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  /* Step 4 Active Ride */
  activeRideScroll: {
    padding: 16,
  },
  activeCard: {
    backgroundColor: '#141820',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#232936',
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontWeight: '700',
    fontSize: 13,
  },
  statusTitleAmber: {
    color: '#F59E0B',
  },
  otpHero: {
    alignItems: 'center',
    backgroundColor: '#0F1218',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#F56B00',
  },
  otpLabel: {
    color: '#F56B00',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  otpValue: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 8,
    marginVertical: 6,
  },
  otpSub: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
  },
  tripMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  metaLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  metaFare: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: '800',
  },
  routeBox: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#2D3748',
    marginLeft: 4,
    marginVertical: 4,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  orangeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F56B00',
  },
  stopLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
  },
  stopName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  carAssignedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A202C',
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  carSearchingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B15',
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  searchingTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  searchingSub: {
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
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
    marginTop: 2,
  },
  driverSubText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
  callChauffeurBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  callChauffeurText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  guardianShieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    marginBottom: 14,
  },
  guardianTitle: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  guardianSub: {
    color: '#A7F3D0',
    fontSize: 10,
    marginTop: 2,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Auth Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141820',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#232936',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoCharSmall: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  authToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1218',
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  authToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  authToggleBtnActive: {
    backgroundColor: '#1E2430',
  },
  authToggleText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  authToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  authInputGroup: {
    marginBottom: 12,
  },
  authLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  authTextInput: {
    backgroundColor: '#0F1218',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#232936',
  },
  authSubmitBtn: {
    backgroundColor: '#F56B00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  authSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
