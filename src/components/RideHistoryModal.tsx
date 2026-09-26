import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  X,
  Clock,
  Car,
  MapPin,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Receipt,
  RotateCcw,
  Sparkles,
  FileText,
  Calendar,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { Booking } from '../types';
import { TaxInvoiceModal } from './TaxInvoiceModal';

interface RideHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onRepeatTrip?: (pickupName: string, dropName: string) => void;
  onResumeBooking?: (booking: Booking) => void;
  theme?: 'light' | 'dark';
}

const { width } = Dimensions.get('window');

export function RideHistoryModal({
  visible,
  onClose,
  user,
  onRepeatTrip,
  onResumeBooking,
  theme = 'light',
}: RideHistoryModalProps) {
  const isDark = theme === 'dark';
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoiceTrip, setSelectedInvoiceTrip] = useState<Booking | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTrips();
    }
  }, [visible, user?.id]);

  async function fetchTrips() {
    try {
      setLoading(true);

      let query = supabase.from('bookings').select('*');

      if (user?.id) {
        query = query.eq('customer_id', user.id);
      } else {
        // Check for device-recorded booking IDs
        try {
          const stored = await AsyncStorage.getItem('@orange_booking_history_ids');
          const ids = stored ? JSON.parse(stored) : [];
          if (Array.isArray(ids) && ids.length > 0) {
            query = query.in('id', ids);
          } else {
            // Simulator or demo fallback: fetch recent 15 bookings so user can see live data
            query = query.limit(15);
          }
        } catch {
          query = query.limit(15);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        setTrips(data as Booking[]);
      }
    } catch (e) {
      console.warn('Error fetching trips from Supabase:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchTrips();
  }

  function formatTripDate(isoString: string): string {
    if (!isoString) return 'Recent Trip';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return { label: 'Completed', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'in_progress':
        return { label: 'In Progress ⚡', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'accepted':
      case 'arrived':
        return { label: 'Arriving 🚗', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'cancelled':
        return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'scheduled':
        return { label: 'Scheduled 📅', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      default:
        return { label: 'Searching 📡', bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' };
    }
  }

  function handleViewInvoice(trip: Booking) {
    Haptics.selectionAsync();
    setSelectedInvoiceTrip(trip);
    setInvoiceModalVisible(true);
  }

  function handleViewReceipt(trip: Booking) {
    handleViewInvoice(trip);
  }

  function handleRepeat(trip: Booking) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    if (onRepeatTrip && trip.pickup_area && trip.drop_area) {
      onRepeatTrip(trip.pickup_area, trip.drop_area);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.card, isDark && styles.cardDark]}>
            {/* Header */}
            <View style={[styles.header, isDark && styles.headerDark]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.headerIconWrap}>
                  <Clock size={20} color="#F97316" />
                </View>
                <View>
                  <Text style={[styles.title, isDark && styles.textWhite]}>Your Trips</Text>
                  <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>Live Ride History & Tax Invoices</Text>
                </View>
              </View>

            <TouchableOpacity style={[styles.closeBtn, isDark && styles.closeBtnDark]} onPress={onClose}>
              <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Subheader summary badge */}
          <View style={[styles.statsBanner, isDark && styles.statsBannerDark]}>
            <View style={styles.statsCol}>
              <Text style={[styles.statsNumber, isDark && styles.textWhite]}>{trips.length}</Text>
              <Text style={[styles.statsLabel, isDark && styles.textMutedDark]}>Total Bookings</Text>
            </View>
            <View style={[styles.statsDivider, isDark && styles.statsDividerDark]} />
            <View style={styles.statsCol}>
              <Text style={[styles.statsNumber, isDark && styles.textWhite]}>100%</Text>
              <Text style={[styles.statsLabel, isDark && styles.textMutedDark]}>Electric Travel</Text>
            </View>
            <View style={[styles.statsDivider, isDark && styles.statsDividerDark]} />
            <View style={styles.statsCol}>
              <Text style={[styles.statsNumber, isDark && styles.textWhite]}>0%</Text>
              <Text style={[styles.statsLabel, isDark && styles.textMutedDark]}>Cancellation Fee</Text>
            </View>
          </View>

          {/* Body Content */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={[styles.loadingText, isDark && styles.textMutedDark]}>Fetching your rides...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Car size={36} color="#F97316" />
              </View>
              <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>No Trips Yet</Text>
              <Text style={[styles.emptySubtitle, isDark && styles.textMutedDark]}>
                When you book 100% electric rides with Orange Taxi, your trip receipts and route history will appear here in real-time.
              </Text>
              <TouchableOpacity style={styles.emptyActionBtn} onPress={onClose}>
                <Text style={styles.emptyActionText}>Book Your First Ride</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.tripList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />
              }
            >
              {trips.map((trip) => {
                const status = getStatusBadge(trip.status);
                const isResumable = ['searching', 'scheduled', 'accepted', 'arrived', 'in_progress'].includes(trip.status);
                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={[
                      styles.tripCard,
                      isDark && styles.tripCardDark,
                      isResumable && (isDark ? styles.tripCardResumableDark : styles.tripCardResumable),
                    ]}
                    activeOpacity={isResumable || trip.status === 'completed' ? 0.88 : 1}
                    onPress={() => {
                      if (isResumable) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onClose();
                        onResumeBooking?.(trip);
                      } else if (trip.status === 'completed') {
                        handleViewInvoice(trip);
                      }
                    }}
                  >
                    {/* Top Row: Date + Status Badge */}
                    <View style={styles.tripHeaderRow}>
                      <View>
                        <Text style={[styles.tripDateText, isDark && styles.textWhite]}>{formatTripDate(trip.created_at)}</Text>
                        <Text style={[styles.tripRefText, isDark && styles.textMutedDark]}>Ref: {trip.reference || trip.id.substring(0, 8).toUpperCase()}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: status.bg, borderColor: status.border },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: status.text }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    {/* Route Details */}
                    <View style={[styles.routeContainer, isDark && styles.routeContainerDark]}>
                      {/* Pickup */}
                      <View style={styles.routeRow}>
                        <View style={styles.greenPickupDot} />
                        <Text style={[styles.routeText, isDark && styles.textWhite]} numberOfLines={1}>
                          {trip.pickup_area}
                        </Text>
                      </View>

                      {/* Route Line */}
                      <View style={styles.verticalRouteLine} />

                      {/* Drop-off */}
                      <View style={styles.routeRow}>
                        <View style={styles.orangeDropDot} />
                        <Text style={[styles.routeText, isDark && styles.textWhite]} numberOfLines={1}>
                          {trip.drop_area}
                        </Text>
                      </View>
                    </View>

                    {/* Meta Strip: Vehicle, Fare, OTP */}
                    <View style={[styles.tripFooterRow, isDark && styles.tripFooterRowDark]}>
                      <View style={styles.vehicleInfoCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Car size={14} color={isDark ? '#94A3B8' : '#6B7280'} />
                          <Text style={[styles.vehicleNameText, isDark && styles.textMutedDark]}>
                            {trip.vehicle_name || 'Mahindra BE.6'}
                          </Text>
                        </View>
                        {trip.ride_otp && trip.status !== 'completed' && trip.status !== 'cancelled' && (
                          <Text style={styles.otpTagText}>OTP: {trip.ride_otp}</Text>
                        )}
                      </View>

                      <View style={styles.fareInfoCol}>
                        <Text style={[styles.fareAmountText, isDark && styles.textWhite]}>₹{trip.estimated_fare}</Text>
                        <Text style={styles.fareDistanceText}>{trip.distance_km || 12} km</Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.tripActionsRow}>
                      {/* Tax Invoice — ONLY for completed trips */}
                      {trip.status === 'completed' ? (
                        <TouchableOpacity
                          style={[styles.invoiceActionBtn, isDark && styles.invoiceActionBtnDark]}
                          onPress={() => handleViewInvoice(trip)}
                        >
                          <FileText size={14} color={isDark ? '#FB923C' : '#EA580C'} />
                          <Text style={[styles.invoiceActionText, isDark && styles.invoiceActionTextDark]}>Tax Invoice</Text>
                        </TouchableOpacity>
                      ) : trip.status === 'searching' ? (
                        /* Searching — show Resume Booking button */
                        <TouchableOpacity
                          style={[styles.resumeActionBtn, isDark && styles.resumeActionBtnDark]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onClose();
                            onResumeBooking?.(trip);
                          }}
                        >
                          <Navigation size={14} color="#F97316" />
                          <Text style={[styles.resumeActionText, isDark && styles.resumeActionTextDark]}>Resume Booking</Text>
                        </TouchableOpacity>
                      ) : trip.status === 'scheduled' ? (
                        /* Scheduled — show View Scheduled Ride button */
                        <TouchableOpacity
                          style={[styles.resumeActionBtn, isDark && styles.resumeActionBtnDark, { borderColor: '#DDD6FE', backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#F5F3FF' }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onClose();
                            onResumeBooking?.(trip);
                          }}
                        >
                          <Calendar size={14} color="#7C3AED" />
                          <Text style={[styles.resumeActionText, { color: '#7C3AED' }]}>View Scheduled Ride</Text>
                        </TouchableOpacity>
                      ) : ['accepted', 'arrived', 'in_progress'].includes(trip.status) ? (
                        /* In-progress / accepted / arrived — track ride */
                        <TouchableOpacity
                          style={[styles.resumeActionBtn, isDark && styles.resumeActionBtnDark]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onClose();
                            onResumeBooking?.(trip);
                          }}
                        >
                          <Navigation size={14} color="#F97316" />
                          <Text style={[styles.resumeActionText, isDark && styles.resumeActionTextDark]}>Track Ride</Text>
                        </TouchableOpacity>
                      ) : null /* CANCELLED RIDES: NO INVOICE / RECEIPT BUTTON */}

                      <TouchableOpacity
                        style={[styles.repeatActionBtn, isDark && styles.repeatActionBtnDark]}
                        onPress={() => handleRepeat(trip)}
                      >
                        <RotateCcw size={14} color="#F97316" />
                        <Text style={[styles.repeatActionText, isDark && styles.repeatActionTextDark]}>Book Again</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </View>

        {/* Tax Invoice Modal rendered inside the modal hierarchy */}
        {invoiceModalVisible && (
          <TaxInvoiceModal
            visible={invoiceModalVisible}
            onClose={() => {
              setInvoiceModalVisible(false);
              setSelectedInvoiceTrip(null);
            }}
            trip={selectedInvoiceTrip}
            user={user}
            theme={theme}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsCol: {
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tripList: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  tripCardResumable: {
    borderWidth: 1.5,
    borderColor: '#FB923C',
    backgroundColor: '#FFFDF9',
  },
  tripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tripDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tripRefText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greenPickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  orangeDropDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  verticalRouteLine: {
    width: 2,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginLeft: 3,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  tripFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  vehicleInfoCol: {
    flex: 1,
  },
  vehicleNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  otpTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F97316',
    marginTop: 3,
    fontFamily: 'monospace',
  },
  fareInfoCol: {
    alignItems: 'flex-end',
  },
  fareAmountText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  fareDistanceText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tripActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  invoiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  invoiceActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  receiptActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  repeatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  repeatActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  cardDark: {
    backgroundColor: '#0F172A',
  },
  headerDark: {
    borderBottomColor: '#1E293B',
  },
  closeBtnDark: {
    backgroundColor: '#1E293B',
  },
  statsBannerDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  statsDividerDark: {
    backgroundColor: '#334155',
  },
  tripCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  tripCardResumableDark: {
    borderWidth: 1.5,
    borderColor: '#F97316',
    backgroundColor: '#1E293B',
  },
  routeContainerDark: {
    backgroundColor: '#0F172A',
  },
  tripFooterRowDark: {
    borderBottomColor: '#334155',
  },
  invoiceActionBtnDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  invoiceActionTextDark: {
    color: '#FB923C',
  },
  repeatActionBtnDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  repeatActionTextDark: {
    color: '#F97316',
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
  resumeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  resumeActionBtnDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  resumeActionText: {
    color: '#EA580C',
    fontSize: 13,
    fontWeight: '700',
  },
  resumeActionTextDark: {
    color: '#FB923C',
  },
});
