import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CheckCircle, CreditCard } from 'lucide-react-native';
import { useRideContext } from '../context/RideContext';
import { ridePaymentState } from '../lib/onlinePayment';

/**
 * Payment status on the active-ride card, like the website: once paid online the passenger is told
 * not to pay the chauffeur; until then they can pay online (UPI / card) at any time.
 */
export function RidePaymentBar() {
  const { activeBooking, payRideOnline, onlinePayBusy, theme } = useRideContext();
  if (!activeBooking) return null;
  if (!['searching', 'scheduled', 'accepted', 'arrived', 'in_progress', 'completed'].includes(activeBooking.status)) {
    return null;
  }
  const state = ridePaymentState(activeBooking);
  const fare = Math.round(Number(activeBooking.final_fare ?? activeBooking.estimated_fare) || 0);
  const dark = theme === 'dark';

  if (state === 'paid_online') {
    return (
      <View style={[s.bar, s.paid]}>
        <CheckCircle size={15} color="#10B981" />
        <Text style={s.paidText}>Paid online · ₹{fare} · Don't pay the chauffeur</Text>
      </View>
    );
  }
  if (state !== 'can_pay_online') return null;
  if (activeBooking.status === 'completed') return null;

  const pickedOnline = activeBooking.payment_method === 'upi';
  return (
    <View style={[s.bar, dark ? s.barDark : s.barLight]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, dark && { color: '#FFFFFF' }]}>
          {pickedOnline ? 'Online payment pending' : 'Paying the chauffeur'}
        </Text>
        <Text style={s.sub}>
          {pickedOnline
            ? `Pay ₹${fare} now by UPI or card, or pay the chauffeur at the end.`
            : `₹${fare} at the end of the ride — cash or UPI. Or pay online now.`}
        </Text>
      </View>
      <TouchableOpacity
        style={s.btn}
        disabled={onlinePayBusy}
        onPress={() => {
          Haptics.selectionAsync();
          payRideOnline(activeBooking);
        }}
        accessibilityRole="button"
        accessibilityLabel="Pay online now"
      >
        {onlinePayBusy ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <CreditCard size={14} color="#FFFFFF" />
            <Text style={s.btnText}>Pay ₹{fare}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  barLight: { backgroundColor: '#FFF7ED', borderColor: 'rgba(249,115,22,0.35)' },
  barDark: { backgroundColor: 'rgba(249,115,22,0.10)', borderColor: 'rgba(249,115,22,0.35)' },
  paid: { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.35)' },
  paidText: { color: '#10B981', fontSize: 12, fontWeight: '800', flex: 1 },
  title: { fontSize: 12, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 92,
    justifyContent: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
