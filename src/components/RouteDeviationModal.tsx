import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, ShieldCheck, Share2, PhoneCall, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { Booking } from '../types';

interface RouteDeviationModalProps {
  visible: boolean;
  booking: Booking | null;
  onDismiss: () => void;
  onSosActivated?: () => void;
}

export function RouteDeviationModal({ visible, booking, onDismiss, onSosActivated }: RouteDeviationModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleAcknowledge() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    if (booking?.id) {
      await supabase.from('bookings').update({ safety_status: 'ok' }).eq('id', booking.id);
    }
    setLoading(false);
    onDismiss();
  }

  async function handleEscalate() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setLoading(true);
    if (booking?.id) {
      await supabase.from('bookings').update({ safety_status: 'escalated' }).eq('id', booking.id);
    }
    setLoading(false);
    onDismiss();
    onSosActivated?.();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={40} color="#EF4444" />
          </View>
          <Text style={styles.title}>Are you okay?</Text>
          <Text style={styles.subtitle}>
            We noticed your cab is traveling unusually far from the expected route. Please confirm you are safe.
          </Text>

          <TouchableOpacity style={styles.btnSafe} onPress={handleAcknowledge} disabled={loading}>
            <ShieldCheck size={20} color="#FFFFFF" />
            <Text style={styles.btnSafeText}>Yes, I changed the route</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnShare} onPress={() => {}} disabled={loading}>
            <Share2 size={20} color="#334155" />
            <Text style={styles.btnShareText}>Share Trip with Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnDanger} onPress={handleEscalate} disabled={loading}>
            <PhoneCall size={20} color="#FFFFFF" />
            <Text style={styles.btnDangerText}>Call Emergency (SOS)</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 20 }} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  content: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  iconContainer: { backgroundColor: '#FEE2E2', padding: 20, borderRadius: 100, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#475569', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  btnSafe: { flexDirection: 'row', backgroundColor: '#10B981', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnSafeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  btnShare: { flexDirection: 'row', backgroundColor: '#F1F5F9', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnShareText: { color: '#334155', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  btnDanger: { flexDirection: 'row', backgroundColor: '#EF4444', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnDangerText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 10 }
});
