import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  PhoneCall,
  Save,
  LogOut,
  LogIn,
  CheckCircle,
  Edit3,
  HeartHandshake,
  Clock,
  Wallet,
  ChevronRight,
  Wind,
  VolumeX,
  PlusCircle,
  Sparkles,
  Sun,
  Moon,
  Home,
  Briefcase,
  MapPin,
  Check,
  Crosshair,
  ArrowLeft,
  Search,
  Navigation,
  Map as MapIcon,
  Trash2,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { RideMap } from './RideMap';
import { LocationItem, searchPlaces, reverseGeocodeCoordSafe } from '../lib/locationService';

export interface GuardianContact {
  name: string;
  phone: string;
  relationship?: string;
}

interface ProfileModalProps {
  visible: boolean;
  onDismiss: () => void;
  user: any;
  onSignOut: () => void;
  onGuardianUpdated?: (guardian: GuardianContact | null) => void;
  onOpenRideHistory?: () => void;
  onOpenAuth?: () => void;
  onOpenAmenities?: () => void;
  walletBalance?: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  onSavedPlacesUpdated?: (places: { home: string; work: string }) => void;
  onOpenTalkToOrange?: () => void;
}

const RELATIONSHIP_OPTIONS = ['Parent', 'Spouse', 'Sibling', 'Friend', 'Colleague'];
const CLIMATE_OPTIONS = [
  { id: 'cool', label: 'Cool 22°C' },
  { id: 'moderate', label: 'Balanced 24°C' },
  { id: 'off', label: 'AC Off / Eco' },
];

export function ProfileModal({
  visible,
  onDismiss,
  user,
  onSignOut,
  onGuardianUpdated,
  onOpenRideHistory,
  onOpenAuth,
  onOpenAmenities,
  walletBalance = 0,
  theme = 'light',
  onToggleTheme,
  onSavedPlacesUpdated,
  onOpenTalkToOrange,
}: ProfileModalProps) {
  const isDark = theme === 'dark';

  // Guardian state
  const [guardian, setGuardian] = useState<GuardianContact | null>(null);
  const [isEditingGuardian, setIsEditingGuardian] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [savingGuardian, setSavingGuardian] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preference states
  const [selectedClimate, setSelectedClimate] = useState('cool');
  const [quietRide, setQuietRide] = useState(false);

  // Saved Places (Home & Work) states
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [workCoords, setWorkCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isEditingHome, setIsEditingHome] = useState(false);
  const [isEditingWork, setIsEditingWork] = useState(false);
  const [homeInput, setHomeInput] = useState('');
  const [workInput, setWorkInput] = useState('');

  // Map Picker State for Home & Work
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<'home' | 'work'>('home');
  const [mapPickerCoords, setMapPickerCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9719, lng: 77.5937 });
  const [mapPickerAddress, setMapPickerAddress] = useState<string>('');
  const [mapPickerCity, setMapPickerCity] = useState<string>('Bengaluru');
  const [mapPickerLoading, setMapPickerLoading] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<LocationItem[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  // Dynamic user trip count from Supabase
  const [rideCount, setRideCount] = useState<number | null>(null);

  // Load saved guardian, preferences & saved places on mount / when opened
  useEffect(() => {
    if (visible) {
      loadGuardianContact();
      loadPreferences();
      loadSavedPlaces();
      if (user?.id) {
        fetchUserStats();
      }
    }
  }, [visible, user?.id]);

  async function loadSavedPlaces() {
    try {
      const home = await AsyncStorage.getItem('@orange_user_home_address');
      if (home) {
        setHomeAddress(home);
        setHomeInput(home);
      }
      const homeC = await AsyncStorage.getItem('@orange_user_home_coords');
      if (homeC) {
        try { setHomeCoords(JSON.parse(homeC)); } catch (e) {}
      }
      const work = await AsyncStorage.getItem('@orange_user_work_address');
      if (work) {
        setWorkAddress(work);
        setWorkInput(work);
      }
      const workC = await AsyncStorage.getItem('@orange_user_work_coords');
      if (workC) {
        try { setWorkCoords(JSON.parse(workC)); } catch (e) {}
      }
    } catch (e) {
      console.warn('Could not load saved places:', e);
    }
  }

  async function openMapPicker(target: 'home' | 'work') {
    Haptics.selectionAsync();
    setMapPickerTarget(target);
    setMapSearchQuery('');
    setMapSearchResults([]);
    setIsSearchingMap(false);
    setMapPickerLoading(true);

    const existingCoords = target === 'home' ? homeCoords : workCoords;
    const existingAddress = target === 'home' ? homeAddress : workAddress;

    if (existingCoords && existingCoords.lat && existingCoords.lng) {
      setMapPickerCoords(existingCoords);
      setMapPickerAddress(existingAddress || `${target === 'home' ? 'Home' : 'Work'} Location`);
      setMapPickerLoading(false);
      setMapPickerVisible(true);
      return;
    }

    // Try current GPS
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords?.latitude && loc?.coords?.longitude) {
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setMapPickerCoords(coords);
          const resolved = await reverseGeocodeCoordSafe(coords.lat, coords.lng);
          setMapPickerAddress(resolved.displayText);
          setMapPickerCity(resolved.cityName);
          setMapPickerLoading(false);
          setMapPickerVisible(true);
          return;
        }
      }
    } catch (e) {}

    // Default fallback (Bengaluru center)
    const fallback = { lat: 12.9719, lng: 77.5937 };
    setMapPickerCoords(fallback);
    try {
      const resolved = await reverseGeocodeCoordSafe(fallback.lat, fallback.lng);
      setMapPickerAddress(resolved.displayText);
      setMapPickerCity(resolved.cityName);
    } catch (e) {
      setMapPickerAddress('Selected Location');
    }
    setMapPickerLoading(false);
    setMapPickerVisible(true);
  }

  async function handleMapPickerRegionChange(coords: { lat: number; lng: number }) {
    setMapPickerCoords(coords);
    try {
      const resolved = await reverseGeocodeCoordSafe(coords.lat, coords.lng);
      if (resolved?.displayText) {
        setMapPickerAddress(resolved.displayText);
        setMapPickerCity(resolved.cityName);
      } else {
        setMapPickerAddress(`Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      }
    } catch (e) {
      setMapPickerAddress(`Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    }
  }

  async function handleMapSearch(text: string) {
    setMapSearchQuery(text);
    if (!text.trim()) {
      setMapSearchResults([]);
      setIsSearchingMap(false);
      return;
    }
    setIsSearchingMap(true);
    try {
      const results = await searchPlaces(text, 'All', mapPickerCoords);
      setMapSearchResults(results);
    } catch (e) {
      setMapSearchResults([]);
    }
  }

  function handleSelectSearchResult(item: LocationItem) {
    Haptics.selectionAsync();
    const coords = { lat: item.lat, lng: item.lng };
    setMapPickerCoords(coords);
    const fullText = item.name + (item.subtitle ? `, ${item.subtitle}` : '');
    setMapPickerAddress(fullText);
    setMapPickerCity(item.city as any);
    setMapSearchQuery('');
    setMapSearchResults([]);
    setIsSearchingMap(false);
  }

  async function handleRecenterGPS() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (loc?.coords?.latitude && loc?.coords?.longitude) {
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setMapPickerCoords(coords);
        const resolved = await reverseGeocodeCoordSafe(coords.lat, coords.lng);
        setMapPickerAddress(resolved.displayText);
        setMapPickerCity(resolved.cityName);
      }
    } catch (e) {
      Alert.alert('Location Error', 'Could not detect your current GPS location.');
    }
  }

  async function handleConfirmMapLocation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleaned = mapPickerAddress.trim() || `${mapPickerTarget === 'home' ? 'Home' : 'Work'} Location`;
    try {
      if (mapPickerTarget === 'home') {
        await AsyncStorage.setItem('@orange_user_home_address', cleaned);
        await AsyncStorage.setItem('@orange_user_home_coords', JSON.stringify(mapPickerCoords));
        setHomeAddress(cleaned);
        setHomeInput(cleaned);
        setHomeCoords(mapPickerCoords);
        setIsEditingHome(false);
        onSavedPlacesUpdated?.({ home: cleaned, work: workAddress });
      } else {
        await AsyncStorage.setItem('@orange_user_work_address', cleaned);
        await AsyncStorage.setItem('@orange_user_work_coords', JSON.stringify(mapPickerCoords));
        setWorkAddress(cleaned);
        setWorkInput(cleaned);
        setWorkCoords(mapPickerCoords);
        setIsEditingWork(false);
        onSavedPlacesUpdated?.({ home: homeAddress, work: cleaned });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMapPickerVisible(false);
      Alert.alert(
        `${mapPickerTarget === 'home' ? 'Home' : 'Work'} Address Saved! 📍`,
        `Your ${mapPickerTarget === 'home' ? 'home' : 'work'} address has been set to:\n\n${cleaned}\n\nYou can now take 1-tap quick rides directly from the home screen.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save address.');
    }
  }

  async function handleClearSavedPlace(target: 'home' | 'work') {
    Alert.alert(
      `Clear ${target === 'home' ? 'Home' : 'Work'} Address`,
      `Are you sure you want to remove your saved ${target === 'home' ? 'home' : 'work'} address?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (target === 'home') {
              await AsyncStorage.removeItem('@orange_user_home_address');
              await AsyncStorage.removeItem('@orange_user_home_coords');
              setHomeAddress('');
              setHomeInput('');
              setHomeCoords(null);
              setIsEditingHome(false);
              onSavedPlacesUpdated?.({ home: '', work: workAddress });
            } else {
              await AsyncStorage.removeItem('@orange_user_work_address');
              await AsyncStorage.removeItem('@orange_user_work_coords');
              setWorkAddress('');
              setWorkInput('');
              setWorkCoords(null);
              setIsEditingWork(false);
              onSavedPlacesUpdated?.({ home: homeAddress, work: '' });
            }
          },
        },
      ]
    );
  }

  async function handleSaveHome() {
    if (!homeInput.trim()) {
      Alert.alert('Address Required', 'Please enter your home address.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleaned = homeInput.trim();
    try {
      await AsyncStorage.setItem('@orange_user_home_address', cleaned);
      setHomeAddress(cleaned);
      setIsEditingHome(false);
      onSavedPlacesUpdated?.({ home: cleaned, work: workAddress });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save home address.');
    }
  }

  async function handleSaveWork() {
    if (!workInput.trim()) {
      Alert.alert('Address Required', 'Please enter your work or office address.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleaned = workInput.trim();
    try {
      await AsyncStorage.setItem('@orange_user_work_address', cleaned);
      setWorkAddress(cleaned);
      setIsEditingWork(false);
      onSavedPlacesUpdated?.({ home: homeAddress, work: cleaned });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save work address.');
    }
  }

  async function fetchUserStats() {
    try {
      const { count, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', user.id);

      if (!error && count !== null) {
        setRideCount(count);
      }
    } catch {
      // Ignore count fetch errors gracefully
    }
  }

  async function loadPreferences() {
    try {
      const storedClimate = await AsyncStorage.getItem('@orange_pref_climate');
      if (storedClimate) setSelectedClimate(storedClimate);

      const storedQuiet = await AsyncStorage.getItem('@orange_pref_quiet');
      if (storedQuiet !== null) setQuietRide(storedQuiet === 'true');
    } catch (e) {
      console.warn('Could not load preferences:', e);
    }
  }

  async function handleClimateChange(climateId: string) {
    Haptics.selectionAsync();
    setSelectedClimate(climateId);
    try {
      await AsyncStorage.setItem('@orange_pref_climate', climateId);
    } catch (e) {
      console.warn('Could not save climate preference:', e);
    }
  }

  async function handleQuietToggle(val: boolean) {
    Haptics.selectionAsync();
    setQuietRide(val);
    try {
      await AsyncStorage.setItem('@orange_pref_quiet', val ? 'true' : 'false');
    } catch (e) {
      console.warn('Could not save quiet preference:', e);
    }
  }

  async function loadGuardianContact() {
    try {
      const stored = await AsyncStorage.getItem('@orange_guardian_contact');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name && parsed?.phone) {
          setGuardian(parsed);
          setGuardianName(parsed.name);
          setGuardianPhone(parsed.phone);
          if (parsed.relationship) setRelationship(parsed.relationship);
          onGuardianUpdated?.(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load guardian contact:', e);
    }
  }

  async function handleSaveGuardian() {
    if (!guardianName.trim() || !guardianPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter both your guardian’s full name and phone number.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavingGuardian(true);

    const contact: GuardianContact = {
      name: guardianName.trim(),
      phone: guardianPhone.trim(),
      relationship,
    };

    try {
      await AsyncStorage.setItem('@orange_guardian_contact', JSON.stringify(contact));
      setGuardian(contact);
      onGuardianUpdated?.(contact);
      setIsEditingGuardian(false);
      setSavedSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e: any) {
      Alert.alert('Error Saving', e.message || 'Could not save guardian contact locally.');
    } finally {
      setSavingGuardian(false);
    }
  }

  function handleCallGuardian() {
    if (!guardian?.phone) return;
    Haptics.selectionAsync();
    const cleanPhone = guardian.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  }

  function confirmSignOut() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Orange Taxi?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          onDismiss();
          onSignOut();
        },
      },
    ]);
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Rider';
  const userPhone = user?.phone || user?.user_metadata?.phone || null;
  const userEmail = user?.email || null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.avatarIconWrap}>
                <User size={20} color="#F97316" />
              </View>
              <View>
                <Text style={styles.title}>Rider Profile</Text>
                <Text style={styles.subTitle}>
                  {user ? 'Account, Safety & Ride Settings' : 'Guest Account · Tap to Sign In'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* RIDER INFO / GUEST CARD */}
            {user ? (
              <View style={styles.riderCard}>
                <View style={styles.riderHeader}>
                  <View style={styles.largeAvatar}>
                    <Text style={styles.largeAvatarChar}>{userName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.riderName}>{userName}</Text>
                      <View style={styles.verifiedBadge}>
                        <ShieldCheck size={11} color="#10B981" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    </View>
                    {userEmail && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Mail size={12} color="#9CA3AF" />
                        <Text style={styles.metaText}>{userEmail}</Text>
                      </View>
                    )}
                    {userPhone && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Phone size={12} color="#9CA3AF" />
                        <Text style={styles.metaText}>{userPhone}</Text>
                      </View>
                    )}
                    {rideCount !== null && (
                      <View style={styles.tripCountPill}>
                        <Sparkles size={11} color="#F97316" />
                        <Text style={styles.tripCountText}>{rideCount} Total Bookings</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.guestCard}>
                <View style={styles.guestHeader}>
                  <View style={styles.guestAvatar}>
                    <User size={26} color="#F97316" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.guestTitle}>Guest Rider</Text>
                    <Text style={styles.guestSub}>Local simulator session active</Text>
                    <View style={styles.guestBadge}>
                      <Text style={styles.guestBadgeText}>Simulated Profile</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.guestSignInBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onDismiss();
                    onOpenAuth?.();
                  }}
                >
                  <LogIn size={16} color="#FFFFFF" />
                  <Text style={styles.guestSignInText}>Sign In / Create Account</Text>
                </TouchableOpacity>
                <Text style={styles.guestFootnote}>
                  Sign in to sync your trips, save favorite routes, and manage Orange Pay.
                </Text>
              </View>
            )}

            {/* ORANGE WALLET CARD */}
            <View style={styles.walletCard}>
              <View style={styles.walletLeft}>
                <View style={styles.walletIconWrap}>
                  <Wallet size={20} color="#F97316" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.walletLabel}>Orange Wallet</Text>
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonBadgeText}>SOON</Text>
                    </View>
                  </View>
                  <Text style={styles.walletAmount}>₹{walletBalance}</Text>
                  <Text style={styles.walletSub}>Razorpay gateway integration in progress</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.addMoneyBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  Alert.alert(
                    'Feature Coming Soon',
                    `Current Balance: ₹${walletBalance}\n\nOnline wallet recharge via Razorpay / UPI is coming soon! Currently, rides can be paid via Cash or direct UPI upon trip completion.`,
                    [{ text: 'Got it', style: 'default' }]
                  );
                }}
              >
                <Clock size={13} color="#F97316" />
                <Text style={styles.addMoneyText}>Coming Soon</Text>
              </TouchableOpacity>
            </View>

            {/* SAVED PLACES: HOME & WORK */}
            <View style={[styles.savedPlacesCard, isDark && styles.savedPlacesCardDark]}>
              <View style={styles.savedPlacesHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MapPin size={18} color="#F97316" />
                  <Text style={[styles.savedPlacesTitle, isDark && styles.textWhite]}>Saved Places</Text>
                </View>
                <Text style={[styles.savedPlacesSub, isDark && styles.textMutedDark]}>1-Tap Quick Ride Destinations</Text>
              </View>

              {/* HOME ROW */}
              <View style={[styles.savedPlaceRow, isDark && styles.savedPlaceRowDark]}>
                <View style={styles.savedPlaceLeft}>
                  <View style={styles.savedPlaceIconWrap}>
                    <Home size={18} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.savedPlaceLabel, isDark && styles.textWhite]}>Home</Text>
                      {homeCoords && (
                        <View style={styles.geoVerifiedBadge}>
                          <Sparkles size={10} color="#16A34A" />
                          <Text style={styles.geoVerifiedText}>GPS Pinned</Text>
                        </View>
                      )}
                    </View>

                    {isEditingHome ? (
                      <View style={{ marginTop: 6 }}>
                        <TextInput
                          style={[styles.savedPlaceInput, isDark && styles.savedPlaceInputDark]}
                          placeholder="Enter home address or pick on map"
                          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                          value={homeInput}
                          onChangeText={setHomeInput}
                          autoFocus
                        />
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <TouchableOpacity
                            style={[styles.chooseOnMapBtn, { backgroundColor: '#EA580C' }]}
                            onPress={() => openMapPicker('home')}
                          >
                            <MapIcon size={13} color="#FFFFFF" />
                            <Text style={styles.savePlaceBtnText}>Choose on Map</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.savePlaceBtn}
                            onPress={handleSaveHome}
                          >
                            <Check size={13} color="#FFFFFF" />
                            <Text style={styles.savePlaceBtnText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.cancelPlaceBtn, isDark && styles.cancelPlaceBtnDark]}
                            onPress={() => {
                              setIsEditingHome(false);
                              setHomeInput(homeAddress);
                            }}
                          >
                            <Text style={[styles.cancelPlaceBtnText, isDark && styles.textMutedDark]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => openMapPicker('home')}
                        style={{ marginTop: 2 }}
                      >
                        <Text
                          style={[
                            homeAddress ? styles.savedPlaceValue : styles.savedPlacePlaceholder,
                            isDark && (homeAddress ? styles.textMutedDark : styles.placeholderDark),
                          ]}
                          numberOfLines={2}
                        >
                          {homeAddress || 'Tap to load map and pinpoint home'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {!isEditingHome && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                    <TouchableOpacity
                      style={[styles.mapPlaceActionBtn, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED', borderColor: '#EA580C' }]}
                      onPress={() => openMapPicker('home')}
                      activeOpacity={0.8}
                    >
                      <MapIcon size={13} color="#EA580C" />
                      <Text style={[styles.mapPlaceActionText, { color: '#EA580C' }]}>Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editPlaceBtn, isDark && styles.editPlaceBtnDark]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setHomeInput(homeAddress);
                        setIsEditingHome(true);
                      }}
                    >
                      <Edit3 size={14} color="#F97316" />
                    </TouchableOpacity>
                    {homeAddress ? (
                      <TouchableOpacity
                        style={[styles.editPlaceBtn, isDark && styles.editPlaceBtnDark]}
                        onPress={() => handleClearSavedPlace('home')}
                      >
                        <Trash2 size={13} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>

              {/* WORK ROW */}
              <View style={[styles.savedPlaceRow, isDark && styles.savedPlaceRowDark, { marginTop: 10 }]}>
                <View style={styles.savedPlaceLeft}>
                  <View style={[styles.savedPlaceIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Briefcase size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.savedPlaceLabel, isDark && styles.textWhite]}>Work / Office</Text>
                      {workCoords && (
                        <View style={[styles.geoVerifiedBadge, { backgroundColor: 'rgba(37, 99, 235, 0.12)', borderColor: 'rgba(37, 99, 235, 0.3)' }]}>
                          <Sparkles size={10} color="#2563EB" />
                          <Text style={[styles.geoVerifiedText, { color: '#2563EB' }]}>GPS Pinned</Text>
                        </View>
                      )}
                    </View>

                    {isEditingWork ? (
                      <View style={{ marginTop: 6 }}>
                        <TextInput
                          style={[styles.savedPlaceInput, isDark && styles.savedPlaceInputDark]}
                          placeholder="Enter office address or pick on map"
                          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                          value={workInput}
                          onChangeText={setWorkInput}
                          autoFocus
                        />
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <TouchableOpacity
                            style={[styles.chooseOnMapBtn, { backgroundColor: '#2563EB' }]}
                            onPress={() => openMapPicker('work')}
                          >
                            <MapIcon size={13} color="#FFFFFF" />
                            <Text style={styles.savePlaceBtnText}>Choose on Map</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.savePlaceBtn, { backgroundColor: '#2563EB' }]}
                            onPress={handleSaveWork}
                          >
                            <Check size={13} color="#FFFFFF" />
                            <Text style={styles.savePlaceBtnText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.cancelPlaceBtn, isDark && styles.cancelPlaceBtnDark]}
                            onPress={() => {
                              setIsEditingWork(false);
                              setWorkInput(workAddress);
                            }}
                          >
                            <Text style={[styles.cancelPlaceBtnText, isDark && styles.textMutedDark]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => openMapPicker('work')}
                        style={{ marginTop: 2 }}
                      >
                        <Text
                          style={[
                            workAddress ? styles.savedPlaceValue : styles.savedPlacePlaceholder,
                            isDark && (workAddress ? styles.textMutedDark : styles.placeholderDark),
                          ]}
                          numberOfLines={2}
                        >
                          {workAddress || 'Tap to load map and pinpoint office'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {!isEditingWork && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                    <TouchableOpacity
                      style={[styles.mapPlaceActionBtn, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', borderColor: '#2563EB' }]}
                      onPress={() => openMapPicker('work')}
                      activeOpacity={0.8}
                    >
                      <MapIcon size={13} color="#2563EB" />
                      <Text style={[styles.mapPlaceActionText, { color: '#2563EB' }]}>Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editPlaceBtn, isDark && styles.editPlaceBtnDark]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setWorkInput(workAddress);
                        setIsEditingWork(true);
                      }}
                    >
                      <Edit3 size={14} color="#2563EB" />
                    </TouchableOpacity>
                    {workAddress ? (
                      <TouchableOpacity
                        style={[styles.editPlaceBtn, isDark && styles.editPlaceBtnDark]}
                        onPress={() => handleClearSavedPlace('work')}
                      >
                        <Trash2 size={13} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
            </View>

            {/* RIDE HISTORY SHORTCUT CARD */}
            <TouchableOpacity
              style={styles.historyCard}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                onDismiss();
                onOpenRideHistory?.();
              }}
            >
              <View style={styles.historyCardLeft}>
                <View style={styles.historyIconWrap}>
                  <Clock size={20} color="#3B82F6" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.historyTitle}>My Trips & Ride History</Text>
                  <Text style={styles.historySub}>
                    Live rides, route tracking & Tax Invoices
                  </Text>
                </View>
              </View>
              <View style={styles.historyActionRight}>
                <Text style={styles.historyActionText}>View All</Text>
                <ChevronRight size={16} color="#3B82F6" />
              </View>
            </TouchableOpacity>

            {/* IN-CAB AMENITIES & FACILITIES SHORTCUT CARD */}
            <TouchableOpacity
              style={styles.amenitiesCard}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                onDismiss();
                onOpenAmenities?.();
              }}
            >
              <View style={styles.amenitiesCardLeft}>
                <View style={styles.amenitiesIconWrap}>
                  <Sparkles size={20} color="#F97316" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.amenitiesTitle}>The Orange Experience</Text>
                    <View style={styles.amenitiesIncludedBadge}>
                      <Text style={styles.amenitiesIncludedText}>INCLUDED</Text>
                    </View>
                  </View>
                  <Text style={styles.amenitiesSub}>
                    LED screens · Studio audio · Daily papers · Bottled water
                  </Text>
                </View>
              </View>
              <View style={styles.amenitiesActionRight}>
                <Text style={styles.amenitiesActionText}>Explore</Text>
                <ChevronRight size={16} color="#F97316" />
              </View>
            </TouchableOpacity>

            {/* RIDE PREFERENCES / COMFORT */}
            <View style={styles.sectionHeader}>
              <Wind size={15} color="#F97316" />
              <Text style={styles.sectionTitle}>CABIN COMFORT & PREFERENCES</Text>
            </View>

            <View style={styles.prefCard}>
              <Text style={styles.prefLabel}>DEFAULT CABIN CLIMATE</Text>
              <View style={styles.climateRow}>
                {CLIMATE_OPTIONS.map((item) => {
                  const isActive = selectedClimate === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.climateChip, isActive && styles.climateChipActive]}
                      onPress={() => handleClimateChange(item.id)}
                    >
                      <Text
                        style={[styles.climateChipText, isActive && styles.climateChipTextActive]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.quietRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <VolumeX size={15} color="#9CA3AF" />
                    <Text style={styles.quietTitle}>Quiet Ride Mode</Text>
                  </View>
                  <Text style={styles.quietSub}>
                    Driver keeps conversational interaction minimal for a restful trip.
                  </Text>
                </View>
                <Switch
                  value={quietRide}
                  onValueChange={handleQuietToggle}
                  trackColor={{ false: '#262626', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* APP APPEARANCE & THEME */}
            <View style={styles.sectionHeader}>
              {theme === 'dark' ? <Moon size={15} color="#F97316" /> : <Sun size={15} color="#F97316" />}
              <Text style={styles.sectionTitle}>APP APPEARANCE & THEME</Text>
            </View>

            <View style={[styles.prefCard, theme === 'dark' && styles.prefCardDark]}>
              <View style={styles.themeInfoRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.prefLabel, theme === 'dark' && styles.textWhite]}>THEME SELECTION</Text>
                  <Text style={[styles.themeDesc, theme === 'dark' && styles.textMutedDark]}>
                    Switch between crisp daylight clarity and executive nighttime darkness.
                  </Text>
                </View>
                <View style={[styles.themeBadge, theme === 'dark' ? styles.themeBadgeDark : styles.themeBadgeLight]}>
                  <Text style={[styles.themeBadgeText, theme === 'dark' ? styles.themeBadgeTextDark : styles.themeBadgeTextLight]}>
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
              </View>

              <View style={styles.themeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    theme === 'light' && styles.themeOptionBtnActive,
                    theme === 'dark' && styles.themeOptionBtnInactiveDark,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onToggleTheme?.('light');
                  }}
                >
                  <Sun size={16} color={theme === 'light' ? '#EA580C' : '#94A3B8'} />
                  <Text
                    style={[
                      styles.themeOptionText,
                      theme === 'light' && styles.themeOptionTextActive,
                      theme === 'dark' && styles.themeOptionTextInactiveDark,
                    ]}
                  >
                    Light (Default)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    theme === 'dark' && styles.themeOptionBtnActiveDark,
                    theme === 'light' && styles.themeOptionBtnInactiveLight,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onToggleTheme?.('dark');
                  }}
                >
                  <Moon size={16} color={theme === 'dark' ? '#F97316' : '#64748B'} />
                  <Text
                    style={[
                      styles.themeOptionText,
                      theme === 'dark' && styles.themeOptionTextActiveDark,
                      theme === 'light' && styles.themeOptionTextInactiveLight,
                    ]}
                  >
                    Dark Mode
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* GUARDIAN SAFETY SECTION */}
            <View style={styles.sectionHeader}>
              <Shield size={16} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: '#10B981' }]}>
                GUARDIAN EMERGENCY CONTACT
              </Text>
            </View>

            <View style={styles.guardianCard}>
              {savedSuccess && (
                <View style={styles.successBar}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={styles.successBarText}>Guardian Emergency Contact Saved!</Text>
                </View>
              )}

              {guardian && !isEditingGuardian ? (
                <View>
                  <View style={styles.guardianActiveRow}>
                    <View style={styles.guardianIconBox}>
                      <HeartHandshake size={24} color="#10B981" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.guardianName}>{guardian.name}</Text>
                      <Text style={styles.guardianSub}>
                        {guardian.relationship || 'Guardian'} · {guardian.phone}
                      </Text>
                      <Text style={styles.guardianStatusTag}>● Active for 1-Tap Calling & Ride Sharing</Text>
                    </View>
                  </View>

                  <View style={styles.guardianActionRow}>
                    <TouchableOpacity style={styles.callGuardianBtn} onPress={handleCallGuardian}>
                      <PhoneCall size={14} color="#FFFFFF" />
                      <Text style={styles.callGuardianText}>Call Guardian</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editGuardianBtn}
                      onPress={() => {
                        setGuardianName(guardian.name);
                        setGuardianPhone(guardian.phone);
                        if (guardian.relationship) setRelationship(guardian.relationship);
                        setIsEditingGuardian(true);
                      }}
                    >
                      <Edit3 size={14} color="#F97316" />
                      <Text style={styles.editGuardianText}>Edit Contact</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ padding: 4 }}>
                  <Text style={styles.guardianFormPrompt}>
                    {guardian
                      ? 'Update your trusted guardian details below:'
                      : 'Set a trusted contact for 1-tap calling and instant live GPS ride alerts:'}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>GUARDIAN FULL NAME</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#6B7280"
                      value={guardianName}
                      onChangeText={setGuardianName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>GUARDIAN PHONE NUMBER</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#6B7280"
                      keyboardType="phone-pad"
                      value={guardianPhone}
                      onChangeText={setGuardianPhone}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>RELATIONSHIP</Text>
                    <View style={styles.chipRow}>
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.relChip, relationship === opt && styles.relChipActive]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setRelationship(opt);
                          }}
                        >
                          <Text
                            style={[
                              styles.relChipText,
                              relationship === opt && styles.relChipTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    {guardian && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setIsEditingGuardian(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.saveBtn, { flex: 1 }]}
                      onPress={handleSaveGuardian}
                      disabled={savingGuardian}
                    >
                      <Save size={15} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>
                        {savingGuardian ? 'Saving...' : 'Save Guardian'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* TALK TO ORANGE CONCIERGE & AI ASSISTANT CARD */}
            <TouchableOpacity
              style={styles.talkToOrangeCard}
              activeOpacity={0.88}
              onPress={() => {
                Haptics.selectionAsync();
                onDismiss();
                onOpenTalkToOrange?.();
              }}
            >
              <View style={styles.talkToOrangeLeft}>
                <View style={styles.talkToOrangeIconWrap}>
                  <Sparkles size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.talkToOrangeTitle}>Talk to Orange</Text>
                    <View style={styles.talkToOrangeBadge}>
                      <Text style={styles.talkToOrangeBadgeText}>24x7 Concierge</Text>
                    </View>
                  </View>
                  <Text style={styles.talkToOrangeSub}>
                    Instant Fares, Fleet Inquiries, Lost & Found & Support
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#F97316" />
            </TouchableOpacity>

            {/* SAFETY DESK & HELPLINES */}
            <View style={styles.helplineCard}>
              <Text style={styles.helplineTitle}>24x7 Safety & Emergency Response</Text>
              <View style={styles.helplineRow}>
                <View>
                  <Text style={styles.helplineLabel}>National Emergency SOS</Text>
                  <Text style={styles.helplineSub}>Police & Medical Helpline</Text>
                </View>
                <TouchableOpacity
                  style={styles.helplineActionBtn}
                  onPress={() => Linking.openURL('tel:112')}
                >
                  <Phone size={12} color="#EF4444" />
                  <Text style={[styles.helplineActionText, { color: '#EF4444' }]}>Dial 112</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.helplineRow, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.helplineLabel}>Orange Fleet Control</Text>
                  <Text style={styles.helplineSub}>24x7 Safety Desk Dispatch</Text>
                </View>
                <TouchableOpacity
                  style={styles.helplineActionBtn}
                  onPress={() => Linking.openURL('tel:+911140007000')}
                >
                  <Phone size={12} color="#F97316" />
                  <Text style={styles.helplineActionText}>+91 11 4000 7000</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SIGN OUT OR SIGN IN BUTTON */}
            {user ? (
              <TouchableOpacity style={styles.signOutCard} onPress={confirmSignOut}>
                <LogOut size={16} color="#EF4444" />
                <Text style={styles.signOutText}>Sign Out of Orange Taxi</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.signInCard}
                onPress={() => {
                  onDismiss();
                  onOpenAuth?.();
                }}
              >
                <LogIn size={16} color="#FFFFFF" />
                <Text style={styles.signInCardText}>Sign In / Register</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 28 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* =============================================================== */}
      {/* FULL-SCREEN INTERACTIVE MAP PICKER FOR SAVED PLACES             */}
      {/* =============================================================== */}
      {mapPickerVisible && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#0B0F19' : '#FFFFFF', zIndex: 9999 }]}>
          {/* Header */}
          <View style={[styles.mapPickerHeader, isDark && styles.mapPickerHeaderDark]}>
            <TouchableOpacity
              style={[styles.mapPickerBackBtn, isDark && styles.mapPickerBackBtnDark]}
              onPress={() => {
                Haptics.selectionAsync();
                setMapPickerVisible(false);
              }}
            >
              <ArrowLeft size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.mapPickerTitle, isDark && styles.textWhite]}>
                {mapPickerTarget === 'home' ? 'Pinpoint Home on Map' : 'Pinpoint Work on Map'}
              </Text>
              <Text style={[styles.mapPickerSub, isDark && styles.textMutedDark]}>
                Drag map to drop pin at your exact gate or door
              </Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          {/* Quick Search Bar */}
          <View style={[styles.mapPickerSearchBarWrap, isDark && styles.mapPickerSearchBarWrapDark]}>
            <Search size={16} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginLeft: 12 }} />
            <TextInput
              style={[styles.mapPickerSearchInput, isDark && styles.mapPickerSearchInputDark]}
              placeholder={`Search area, colony or tech park...`}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={mapSearchQuery}
              onChangeText={handleMapSearch}
            />
            {mapSearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setMapSearchQuery('');
                  setMapSearchResults([]);
                  setIsSearchingMap(false);
                }}
                style={{ padding: 8 }}
              >
                <X size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown overlay */}
          {isSearchingMap && mapSearchResults.length > 0 && (
            <View style={[styles.mapSearchResultsCard, isDark && styles.mapSearchResultsCardDark]}>
              <FlatList
                data={mapSearchResults}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.mapSearchItem, isDark && styles.mapSearchItemDark]}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <MapPin size={16} color="#F97316" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.mapSearchItemName, isDark && styles.textWhite]}>{item.name}</Text>
                      {item.subtitle ? (
                        <Text style={[styles.mapSearchItemSub, isDark && styles.textMutedDark]} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Map View */}
          <View style={{ flex: 1, position: 'relative' }}>
            <RideMap
              pickup={mapPickerCoords}
              interactive={true}
              height="100%"
              isPinPickerMode={true}
              pinPickerTarget={mapPickerTarget}
              onPinLocationChange={handleMapPickerRegionChange}
              theme={theme}
            />

            {/* Floating GPS Recenter Button */}
            <TouchableOpacity
              style={[styles.mapPickerGpsBtn, isDark && styles.mapPickerGpsBtnDark]}
              onPress={handleRecenterGPS}
              activeOpacity={0.85}
            >
              <Crosshair size={20} color="#F97316" />
            </TouchableOpacity>
          </View>

          {/* Bottom Confirmation Card */}
          <View style={[styles.mapPickerBottomCard, isDark && styles.mapPickerBottomCardDark]}>
            <View style={styles.mapPickerAddressRow}>
              <View style={[
                styles.mapPickerIconBadge,
                mapPickerTarget === 'home' ? { backgroundColor: '#EA580C' } : { backgroundColor: '#2563EB' },
              ]}>
                {mapPickerTarget === 'home' ? (
                  <Home size={20} color="#FFFFFF" />
                ) : (
                  <Briefcase size={20} color="#FFFFFF" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.mapPickerMicroLabel, isDark && styles.textMutedDark]}>
                  {mapPickerTarget === 'home' ? 'SAVED HOME LOCATION' : 'SAVED WORK LOCATION'}
                </Text>
                <Text style={[styles.mapPickerAddressTitle, isDark && styles.textWhite]} numberOfLines={2}>
                  {mapPickerAddress || 'Position pin at your building or gate'}
                </Text>
                <Text style={[styles.mapPickerCoordsText, isDark && styles.textMutedDark]}>
                  {mapPickerCity} • ({mapPickerCoords.lat.toFixed(4)}, {mapPickerCoords.lng.toFixed(4)})
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.mapPickerConfirmBtn,
                mapPickerTarget === 'home' ? { backgroundColor: '#EA580C' } : { backgroundColor: '#2563EB' },
              ]}
              onPress={handleConfirmMapLocation}
              activeOpacity={0.85}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.mapPickerConfirmBtnText}>
                {mapPickerTarget === 'home' ? 'Confirm & Save Home Address' : 'Confirm & Save Work Address'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0E1117',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  riderCard: {
    backgroundColor: '#14171F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 16,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderWidth: 2,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarChar: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F97316',
  },
  riderName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tripCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  tripCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  guestCard: {
    backgroundColor: '#14171F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    padding: 16,
    marginBottom: 16,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1.5,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guestSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  guestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  guestSignInText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guestFootnote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14171F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    padding: 16,
    marginBottom: 14,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  comingSoonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  comingSoonBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.4,
  },
  walletAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  walletSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addMoneyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14171F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    padding: 16,
    marginBottom: 20,
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historySub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  historyActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
  },
  amenitiesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14171F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    padding: 16,
    marginBottom: 20,
  },
  amenitiesCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  amenitiesIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenitiesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  amenitiesIncludedBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  amenitiesIncludedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.5,
  },
  amenitiesSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  amenitiesActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenitiesActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#F97316',
  },
  prefCard: {
    backgroundColor: '#14171F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 20,
  },
  prefLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  climateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  climateChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0B0D11',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  climateChipActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    borderColor: '#F97316',
  },
  climateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  climateChipTextActive: {
    color: '#F97316',
    fontWeight: '800',
  },
  quietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  quietTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quietSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15,
  },
  guardianCard: {
    backgroundColor: '#14171F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 16,
    marginBottom: 20,
  },
  successBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  successBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  guardianActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardianIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guardianSub: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 2,
    fontWeight: '500',
  },
  guardianStatusTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 3,
  },
  guardianActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  callGuardianBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 12,
  },
  callGuardianText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  editGuardianBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editGuardianText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  guardianFormPrompt: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#0B0D11',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  relChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0B0D11',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  relChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
  },
  relChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  relChipTextActive: {
    color: '#10B981',
    fontWeight: '800',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F97316',
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  talkToOrangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14171F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
    padding: 16,
    marginBottom: 20,
  },
  talkToOrangeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  talkToOrangeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  talkToOrangeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  talkToOrangeBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  talkToOrangeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F97316',
    textTransform: 'uppercase',
  },
  talkToOrangeSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  helplineCard: {
    backgroundColor: '#14171F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 20,
  },
  helplineTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  helplineLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helplineSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  helplineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  helplineActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  signInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 14,
  },
  signInCardText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  themeInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  themeDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  themeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeBadgeLight: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  themeBadgeDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  themeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  themeBadgeTextLight: {
    color: '#C2410C',
  },
  themeBadgeTextDark: {
    color: '#FB923C',
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  themeOptionBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
    borderWidth: 1.5,
  },
  themeOptionBtnActiveDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderColor: '#F97316',
    borderWidth: 1.5,
  },
  themeOptionBtnInactiveDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  themeOptionBtnInactiveLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  themeOptionTextActive: {
    color: '#C2410C',
    fontWeight: '800',
  },
  themeOptionTextActiveDark: {
    color: '#F97316',
    fontWeight: '800',
  },
  themeOptionTextInactiveDark: {
    color: '#94A3B8',
  },
  themeOptionTextInactiveLight: {
    color: '#64748B',
  },
  prefCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
  cardDark: {
    backgroundColor: '#0F172A',
  },
  headerDark: {
    backgroundColor: '#0F172A',
    borderBottomColor: '#1E293B',
  },
  savedPlacesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  savedPlacesCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  savedPlacesHeader: {
    marginBottom: 14,
  },
  savedPlacesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  savedPlacesSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  savedPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  savedPlaceRowDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  savedPlaceLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  savedPlaceIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  savedPlaceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  savedPlaceValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginTop: 2,
  },
  savedPlacePlaceholder: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  placeholderDark: {
    color: '#64748B',
  },
  savedPlaceInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  savedPlaceInputDark: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
    color: '#F8FAFC',
  },
  savePlaceBtn: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  savePlaceBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelPlaceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelPlaceBtnDark: {
    borderColor: '#475569',
  },
  cancelPlaceBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  editPlaceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  editPlaceBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  chooseOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  mapPlaceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapPlaceActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  geoVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  geoVerifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  mapPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapPickerHeaderDark: {
    backgroundColor: '#0F172A',
    borderBottomColor: '#1E293B',
  },
  mapPickerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerBackBtnDark: {
    backgroundColor: '#1E293B',
  },
  mapPickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  mapPickerSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  mapPickerSearchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapPickerSearchBarWrapDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  mapPickerSearchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  mapPickerSearchInputDark: {
    color: '#F8FAFC',
  },
  mapSearchResultsCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 172 : 136,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  mapSearchResultsCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  mapSearchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mapSearchItemDark: {
    borderBottomColor: '#334155',
  },
  mapSearchItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapSearchItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  mapPickerGpsBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapPickerGpsBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  mapPickerBottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  mapPickerBottomCardDark: {
    backgroundColor: '#0F172A',
    borderTopColor: '#1E293B',
  },
  mapPickerAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mapPickerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerMicroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  mapPickerAddressTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 19,
  },
  mapPickerCoordsText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  mapPickerConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapPickerConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
