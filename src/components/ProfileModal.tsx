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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
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
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';

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
  walletBalance?: number;
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
  walletBalance = 250,
}: ProfileModalProps) {
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

  // Dynamic user trip count from Supabase
  const [rideCount, setRideCount] = useState<number | null>(null);

  // Load saved guardian & preferences on mount / when opened
  useEffect(() => {
    if (visible) {
      loadGuardianContact();
      loadPreferences();
      if (user?.id) {
        fetchUserStats();
      }
    }
  }, [visible, user?.id]);

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
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.walletLabel}>Orange Wallet</Text>
                  <Text style={styles.walletAmount}>₹{walletBalance}</Text>
                  <Text style={styles.walletSub}>Auto-pay on drop · Zero surge fee</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.addMoneyBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  Alert.alert(
                    'Orange Wallet Recharge',
                    `Current Balance: ₹${walletBalance}\n\nFast recharge amounts:\n• ₹250 (Basic City Commute)\n• ₹500 (Airport Express)\n• ₹1000 (Weekly Pass)`,
                    [
                      { text: 'Add ₹250', onPress: () => Alert.alert('Success', '₹250 added to Orange Wallet!') },
                      { text: 'Add ₹500', onPress: () => Alert.alert('Success', '₹500 added to Orange Wallet!') },
                      { text: 'Close', style: 'cancel' },
                    ]
                  );
                }}
              >
                <PlusCircle size={14} color="#F97316" />
                <Text style={styles.addMoneyText}>Top Up</Text>
              </TouchableOpacity>
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
                    Live Supabase rides, route tracking & GST invoices
                  </Text>
                </View>
              </View>
              <View style={styles.historyActionRight}>
                <Text style={styles.historyActionText}>View All</Text>
                <ChevronRight size={16} color="#3B82F6" />
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
});
