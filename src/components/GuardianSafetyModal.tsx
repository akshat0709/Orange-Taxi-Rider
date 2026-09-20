import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  Share2,
  AlertTriangle,
  Radio,
  UserCheck,
  Car,
  Clock,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { Booking, Driver } from '../types';
import { GuardianContact } from './ProfileModal';

interface GuardianSafetyModalProps {
  visible: boolean;
  onDismiss: () => void;
  booking: Booking | null;
  driver: Driver | null;
  guardian: GuardianContact | null;
  onOpenGuardianSetup: () => void;
}

export function GuardianSafetyModal({
  visible,
  onDismiss,
  booking,
  driver,
  guardian,
  onOpenGuardianSetup,
}: GuardianSafetyModalProps) {
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const countdownTimerRef = useRef<any>(null);

  // Countdown effect
  useEffect(() => {
    if (sosCountdown === null) return;

    if (sosCountdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setSosCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (sosCountdown === 0) {
      executeEmergencySos();
      setSosCountdown(null);
    }

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [sosCountdown]);

  function startSosCountdown() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setSosCountdown(3);
  }

  function cancelSosCountdown() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setSosCountdown(null);
  }

  async function executeEmergencySos() {
    setSosActive(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // 1. Mark SOS on active booking in Supabase
    if (booking?.id) {
      try {
        await supabase
          .from('bookings')
          .update({ sos_raised: true })
          .eq('id', booking.id);
      } catch (e) {
        console.warn('Could not flag SOS on booking:', e);
      }
    }

    // 2. Dispatch emergency alert to Guardian via WhatsApp if configured
    if (guardian?.phone) {
      const cleanTarget = guardian.phone.replace(/[^0-9]/g, '');
      const formattedTarget = cleanTarget.startsWith('91') ? cleanTarget : `91${cleanTarget}`;
      const sosMessage = `🚨 *URGENT EMERGENCY SOS ALERT*\n\n` +
        `I have raised an emergency SOS in my Orange Electric Taxi.\n\n` +
        `• *Booking Ref:* #${booking?.reference || 'ACTIVE'}\n` +
        `• *Vehicle:* ${driver?.vehicle_number || booking?.vehicle_name || 'Orange EV'}\n` +
        `• *Chauffeur:* ${driver?.full_name || 'Driver'} (${driver?.phone || 'Helpline'})\n` +
        `• *Live Radar Tracking:* https://orange-taxi.com/track?ref=${booking?.reference || ''}\n\n` +
        `Police (112) is being dialed now. Please check on me immediately!`;

      Linking.openURL(`https://wa.me/${formattedTarget}?text=${encodeURIComponent(sosMessage)}`).catch(() => {});
    }

    // 3. Dial National Emergency Helpline (112)
    setTimeout(() => {
      Linking.openURL('tel:112');
    }, 600);
  }

  function handleCallGuardian() {
    if (!guardian?.phone) {
      Alert.alert(
        'Guardian Contact Required',
        'You have not configured a guardian contact yet. Would you like to set one up now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Setup Guardian', onPress: onOpenGuardianSetup },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const cleanPhone = guardian.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  }

  function handleShareLiveRide() {
    Haptics.selectionAsync();
    const refStr = booking?.reference ? `#${booking.reference}` : 'Active Journey';
    const plate = driver?.vehicle_number || 'Orange EV';
    const model = driver?.vehicle_model || booking?.vehicle_name || 'Electric Sedan';
    const driverName = driver?.full_name || 'Orange Chauffeur';
    const driverPhone = driver?.phone || '+91 11 4000 7000';
    const pickup = booking?.pickup_area || 'Pickup Point';
    const drop = booking?.drop_area || 'Destination';
    const trackUrl = `https://orange-taxi.com/track?ref=${booking?.reference || ''}`;

    const text = `🛡️ *Orange Taxi · Live Journey Status*\n\n` +
      `Hey, I am currently riding in an Orange EV Taxi:\n\n` +
      `• *Booking:* ${refStr}\n` +
      `• *Vehicle:* ${plate} (${model})\n` +
      `• *Chauffeur:* ${driverName} (${driverPhone})\n` +
      `• *Route:* ${pickup} → ${drop}\n` +
      `• *Live Radar Tracking:* ${trackUrl}\n\n` +
      `Monitored 24x7 by Orange Safety Operations Control.`;

    if (guardian?.phone) {
      const cleanTarget = guardian.phone.replace(/[^0-9]/g, '');
      const formattedTarget = cleanTarget.startsWith('91') ? cleanTarget : `91${cleanTarget}`;
      Linking.openURL(`https://wa.me/${formattedTarget}?text=${encodeURIComponent(text)}`);
    } else {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.shieldIconWrap}>
                <ShieldCheck size={22} color="#10B981" />
              </View>
              <View>
                <Text style={styles.title}>Guardian Safety Suite</Text>
                <Text style={styles.subTitle}>24x7 Monitored Ride Protection</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* SOS COUNTDOWN MODAL OVERLAY */}
            {sosCountdown !== null && (
              <View style={styles.sosCountdownBox}>
                <AlertTriangle size={32} color="#EF4444" />
                <Text style={styles.sosCountdownTitle}>EMERGENCY SOS INITIATED</Text>
                <Text style={styles.sosCountdownSub}>Calling National Emergency 112 in:</Text>
                <Text style={styles.sosCountdownNumber}>{sosCountdown}</Text>
                <TouchableOpacity style={styles.sosCancelBtn} onPress={cancelSosCountdown}>
                  <Text style={styles.sosCancelText}>CANCEL SOS</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TRIP SAFETY CONTEXT CARD */}
            <View style={styles.tripCard}>
              <View style={styles.tripRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Car size={16} color="#F56B00" />
                  <Text style={styles.tripPlate}>
                    {driver?.vehicle_number || 'KA 01 EV 4421'}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Radio size={10} color="#10B981" />
                  <Text style={styles.statusText}>Live Telemetry</Text>
                </View>
              </View>

              <Text style={styles.tripModel}>
                {driver?.vehicle_model || booking?.vehicle_name || 'Mahindra BE.6 Electric SUV'} · Chauffeur: {driver?.full_name || 'Verified Driver'}
              </Text>

              {booking?.reference && (
                <Text style={styles.tripRef}>Booking Reference: #{booking.reference}</Text>
              )}
            </View>

            {/* ACTION 1: CALL GUARDIAN */}
            <TouchableOpacity
              style={styles.guardianActionCard}
              onPress={handleCallGuardian}
              activeOpacity={0.8}
            >
              <View style={styles.callGuardianIcon}>
                <PhoneCall size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.actionTitle}>1-Tap Call Guardian</Text>
                  {guardian && (
                    <View style={styles.guardianPill}>
                      <Text style={styles.guardianPillText}>{guardian.name}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionSub}>
                  {guardian
                    ? `Direct dial to ${guardian.name} (${guardian.phone})`
                    : 'Tap to configure trusted guardian contact'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* ACTION 2: SHARE LIVE RIDE */}
            <TouchableOpacity
              style={styles.shareActionCard}
              onPress={handleShareLiveRide}
              activeOpacity={0.8}
            >
              <View style={styles.shareIcon}>
                <Share2 size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.actionTitle}>Share Live Ride via WhatsApp</Text>
                <Text style={styles.actionSub}>
                  Send real-time GPS tracking link, vehicle plate & driver details
                </Text>
              </View>
            </TouchableOpacity>

            {/* ACTION 3: 112 NATIONAL EMERGENCY SOS */}
            <TouchableOpacity
              style={styles.sosActionCard}
              onPress={startSosCountdown}
              activeOpacity={0.8}
            >
              <View style={styles.sosIcon}>
                <ShieldAlert size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.sosActionTitle}>Emergency SOS (112)</Text>
                <Text style={styles.sosActionSub}>
                  Direct line to Police, Ambulance & Orange Emergency Escalation
                </Text>
              </View>
            </TouchableOpacity>

            {/* ACTION 4: ORANGE SAFETY DESK */}
            <View style={styles.helplineBox}>
              <View>
                <Text style={styles.helplineTitle}>Orange 24x7 Safety Operations</Text>
                <Text style={styles.helplinePhone}>+91 11 4000 7000</Text>
              </View>
              <TouchableOpacity
                style={styles.helplineBtn}
                onPress={() => Linking.openURL('tel:+911140007000')}
              >
                <PhoneCall size={14} color="#F56B00" />
                <Text style={styles.helplineBtnText}>Call Fleet</Text>
              </TouchableOpacity>
            </View>

            {/* GUARDIAN CONFIGURATION SHORTCUT */}
            <TouchableOpacity
              style={styles.configBtn}
              onPress={() => {
                onDismiss();
                onOpenGuardianSetup();
              }}
            >
              <Text style={styles.configText}>
                {guardian ? '⚙️ Edit Guardian Contact' : '➕ Setup Guardian Contact in Profile'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 28 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0E1117',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    paddingBottom: 20,
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
  shieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
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
    color: '#10B981',
    fontWeight: '600',
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
  sosCountdownBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  sosCountdownTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 1,
    marginTop: 8,
  },
  sosCountdownSub: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
  },
  sosCountdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#EF4444',
    marginVertical: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sosCancelBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sosCancelText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EF4444',
  },
  tripCard: {
    backgroundColor: '#14171F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 16,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripPlate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F56B00',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  tripModel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
  },
  tripRef: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },
  guardianActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14171F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: 16,
    marginBottom: 12,
  },
  callGuardianIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14171F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 16,
    marginBottom: 12,
  },
  shareIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 16,
    marginBottom: 16,
  },
  sosIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 16,
  },
  sosActionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.2,
  },
  sosActionSub: {
    fontSize: 12,
    color: '#FCA5A5',
    marginTop: 2,
    lineHeight: 16,
  },
  guardianPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  guardianPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  helplineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14171F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 14,
  },
  helplineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helplinePhone: {
    fontSize: 12,
    color: '#F56B00',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
  },
  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 107, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  helplineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F56B00',
  },
  configBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  configText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
});
