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
  CheckCircle,
  Edit3,
  HeartHandshake,
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
}

const RELATIONSHIP_OPTIONS = ['Parent', 'Spouse', 'Sibling', 'Friend', 'Colleague'];

export function ProfileModal({
  visible,
  onDismiss,
  user,
  onSignOut,
  onGuardianUpdated,
}: ProfileModalProps) {
  const [guardian, setGuardian] = useState<GuardianContact | null>(null);
  const [isEditingGuardian, setIsEditingGuardian] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [savingGuardian, setSavingGuardian] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load saved guardian on mount / when opened
  useEffect(() => {
    if (visible) {
      loadGuardianContact();
    }
  }, [visible]);

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

      // Fallback: check profile in Supabase
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle();
        // Keep default empty if no remote guardian
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
  const userPhone = user?.phone || user?.user_metadata?.phone || 'Verified Mobile';
  const userEmail = user?.email || 'Authenticated Account';

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
                <User size={20} color="#F56B00" />
              </View>
              <View>
                <Text style={styles.title}>Rider Profile</Text>
                <Text style={styles.subTitle}>Account & Safety Controls</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* RIDER INFO CARD */}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Mail size={12} color="#9CA3AF" />
                    <Text style={styles.metaText}>{userEmail}</Text>
                  </View>
                  {userPhone !== 'Verified Mobile' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Phone size={12} color="#9CA3AF" />
                      <Text style={styles.metaText}>{userPhone}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* GUARDIAN SAFETY SECTION */}
            <View style={styles.sectionHeader}>
              <Shield size={16} color="#10B981" />
              <Text style={styles.sectionTitle}>GUARDIAN EMERGENCY CONTACT</Text>
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
                      <Edit3 size={14} color="#F56B00" />
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
                  <Phone size={12} color="#F56B00" />
                  <Text style={styles.helplineActionText}>+91 11 4000 7000</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SIGN OUT BUTTON */}
            <TouchableOpacity style={styles.signOutCard} onPress={confirmSignOut}>
              <LogOut size={16} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out of Orange Taxi</Text>
            </TouchableOpacity>

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
    maxHeight: '88%',
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
    backgroundColor: 'rgba(245, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 107, 0, 0.3)',
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
    marginBottom: 20,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245, 107, 0, 0.2)',
    borderWidth: 2,
    borderColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarChar: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F56B00',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#10B981',
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
    backgroundColor: 'rgba(245, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 107, 0, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editGuardianText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F56B00',
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
    backgroundColor: '#F56B00',
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
    fontSize: 12,
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
    color: '#F56B00',
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
});
