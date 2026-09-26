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
  Trash2,
  AlertCircle,
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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcomingTrips = trips.filter(
    (t) =>
      t.status === 'scheduled' ||
      (t.scheduled_at && !['completed', 'cancelled'].includes(t.status)) ||
      (t.status === 'searching' && t.scheduled_at)
  );

  const pastTrips = trips.filter(
    (t) =>
      ['completed', 'cancelled'].includes(t.status) ||
      (!t.scheduled_at && ['searching', 'accepted', 'arrived', 'in_progress'].includes(t.status))
  );

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

  function formatScheduleFull(isoString: string): string {
    if (!isoString) return 'Upcoming Schedule';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
      const diffMins = Math.round(diffMs / (1000 * 60));

      let relative = '';
      if (diffMins < 0) {
        relative = 'Pickup time reached';
      } else if (diffMins < 60) {
        relative = `In ${diffMins} mins`;
      } else if (diffHrs < 24) {
        relative = `In ${diffHrs} hrs`;
      } else {
        const days = Math.floor(diffHrs / 24);
        relative = `In ${days} day${days > 1 ? 's' : ''}`;
      }

      const dateStr = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return `${dateStr} at ${timeStr} • ${relative}`;
    } catch {
      return isoString;
    }
  }

  async function handleCancelScheduledTrip(trip: Booking) {
    Alert.alert(
      'Cancel Scheduled Ride',
      `Are you sure you want to cancel your scheduled ride for ${formatTripDate(trip.scheduled_at || trip.created_at)}? There is zero cancellation fee.`,
      [
        { text: 'Keep Ride', style: 'cancel' },
        {
          text: 'Cancel Ride',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const { error } = await supabase
              .from('bookings')
              .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
              .eq('id', trip.id);
            if (!error) {
              setTrips((prev) =>
                prev.map((t) => (t.id === trip.id ? { ...t, status: 'cancelled' } : t))
              );
              Alert.alert('Ride Cancelled', 'Your advance scheduled booking has been cancelled.');
            } else {
              Alert.alert('Notice', 'Unable to cancel ride right now. Please try again.');
            }
          },
        },
      ]
    );
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
              <Text style={[styles.statsNumber, isDark && styles.textWhite]}>{upcomingTrips.length}</Text>
              <Text style={[styles.statsLabel, isDark && styles.textMutedDark]}>Upcoming</Text>
            </View>
            <View style={[styles.statsDivider, isDark && styles.statsDividerDark]} />
            <View style={styles.statsCol}>
              <Text style={[styles.statsNumber, isDark && styles.textWhite]}>{pastTrips.length}</Text>
              <Text style={[styles.statsLabel, isDark && styles.textMutedDark]}>Past Trips</Text>
            </View>
            <View style={[styles.statsDivider, isDark && styles.statsDividerDark]} />
            <View style={styles.statsCol}>
              <Text style={[styles.statsNumber, isDark && styles.textWhite]}>100%</Text>
              <Text style={[styles.statsLabel, isDark && styles.textMutedDark]}>Electric</Text>
            </View>
          </View>

          {/* TAB BAR: UPCOMING & SCHEDULED vs. COMPLETED & PAST */}
          <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'upcoming' && styles.tabBtnActiveUpcoming,
                isDark && activeTab === 'upcoming' && styles.tabBtnActiveUpcomingDark,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('upcoming');
              }}
            >
              <Calendar size={14} color={activeTab === 'upcoming' ? '#7C3AED' : (isDark ? '#94A3B8' : '#64748B')} />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'upcoming' && styles.tabBtnTextActivePurple,
                  isDark && activeTab !== 'upcoming' && styles.textMutedDark,
                ]}
              >
                Upcoming & Scheduled
              </Text>
              {upcomingTrips.length > 0 && (
                <View style={styles.tabBadgePurple}>
                  <Text style={styles.tabBadgeTextPurple}>{upcomingTrips.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'past' && styles.tabBtnActivePast,
                isDark && activeTab === 'past' && styles.tabBtnActivePastDark,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('past');
              }}
            >
              <Clock size={14} color={activeTab === 'past' ? '#F97316' : (isDark ? '#94A3B8' : '#64748B')} />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'past' && styles.tabBtnTextActiveOrange,
                  isDark && activeTab !== 'past' && styles.textMutedDark,
                ]}
              >
                Past Trips
              </Text>
              {pastTrips.length > 0 && (
                <View style={styles.tabBadgeOrange}>
                  <Text style={styles.tabBadgeTextOrange}>{pastTrips.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={[styles.loadingText, isDark && styles.textMutedDark]}>Fetching your rides...</Text>
            </View>
          ) : (activeTab === 'upcoming' ? upcomingTrips : pastTrips).length === 0 ? (
            activeTab === 'upcoming' ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                  <Calendar size={36} color="#7C3AED" />
                </View>
                <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>No Scheduled Rides</Text>
                <Text style={[styles.emptySubtitle, isDark && styles.textMutedDark]}>
                  You have no advance scheduled bookings. Use the Schedule button on the home screen to reserve your rides up to 7 days ahead with zero surge pricing!
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: '#7C3AED' }]}
                  onPress={onClose}
                >
                  <Text style={styles.emptyActionText}>Schedule a Ride</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Car size={36} color="#F97316" />
                </View>
                <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>No Past Trips Yet</Text>
                <Text style={[styles.emptySubtitle, isDark && styles.textMutedDark]}>
                  When you complete rides with Orange Taxi, your trip receipts and downloadable tax invoices will appear here.
                </Text>
                <TouchableOpacity style={styles.emptyActionBtn} onPress={onClose}>
                  <Text style={styles.emptyActionText}>Book Your First Ride</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )
          ) : (
            <ScrollView
              style={styles.tripList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />
              }
            >
              {(activeTab === 'upcoming' ? upcomingTrips : pastTrips).map((trip) => {
                const status = getStatusBadge(trip.status);
                const isResumable = ['searching', 'scheduled', 'accepted', 'arrived', 'in_progress'].includes(trip.status);
                const isScheduled = trip.status === 'scheduled';
                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={[
                      styles.tripCard,
                      isDark && styles.tripCardDark,
                      isScheduled && (isDark ? styles.tripCardScheduledDark : styles.tripCardScheduled),
                      !isScheduled && isResumable && (isDark ? styles.tripCardResumableDark : styles.tripCardResumable),
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
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.tripDateText, isDark && styles.textWhite]}>
                          {isScheduled && trip.scheduled_at
                            ? `📅 ${formatScheduleFull(trip.scheduled_at)}`
                            : formatTripDate(trip.created_at)}
                        </Text>
                        <Text style={[styles.tripRefText, isDark && styles.textMutedDark]}>
                          Ref: {trip.reference || trip.id.substring(0, 8).toUpperCase()}
                        </Text>
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

                    {/* SCHEDULED RIDE DISPATCH WINDOW BANNER */}
                    {isScheduled && (
                      <View style={[styles.scheduledCardInfoBox, isDark && styles.scheduledCardInfoBoxDark]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={13} color="#7C3AED" />
                          <Text style={[styles.scheduledCardInfoTitle, isDark && styles.textWhite]}>
                            Chauffeur Dispatch Window
                          </Text>
                        </View>
                        <Text style={[styles.scheduledCardInfoText, isDark && styles.textMutedDark]}>
                          Zero surge fare locked. Fleet Chauffeur assignment begins 15–30 mins before pickup with pre-cooled AC at 22°C.
                        </Text>
                      </View>
                    )}

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
                      {trip.status === 'completed' ? (
                        <TouchableOpacity
                          style={[styles.invoiceActionBtn, isDark && styles.invoiceActionBtnDark]}
                          onPress={() => handleViewInvoice(trip)}
                        >
                          <FileText size={14} color={isDark ? '#FB923C' : '#EA580C'} />
                          <Text style={[styles.invoiceActionText, isDark && styles.invoiceActionTextDark]}>Tax Invoice</Text>
                        </TouchableOpacity>
                      ) : isScheduled ? (
                        <>
                          <TouchableOpacity
                            style={[styles.cancelActionBtn, isDark && styles.cancelActionBtnDark]}
                            onPress={() => handleCancelScheduledTrip(trip)}
                          >
                            <Trash2 size={13} color="#EF4444" />
                            <Text style={styles.cancelActionText}>Cancel</Text>
                          </TouchableOpacity>
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
                        </>
                      ) : trip.status === 'searching' ? (
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
                      ) : ['accepted', 'arrived', 'in_progress'].includes(trip.status) ? (
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
                      ) : null}

                      {!isScheduled && (
                        <TouchableOpacity
                          style={[styles.repeatActionBtn, isDark && styles.repeatActionBtnDark]}
                          onPress={() => handleRepeat(trip)}
                        >
                          <RotateCcw size={14} color="#F97316" />
                          <Text style={[styles.repeatActionText, isDark && styles.repeatActionTextDark]}>Book Again</Text>
                        </TouchableOpacity>
                      )}
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

  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
  },
  tabBarDark: {
    backgroundColor: '#0F172A',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  tabBtnActiveUpcoming: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnActiveUpcomingDark: {
    backgroundColor: '#1E293B',
  },
  tabBtnActivePast: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnActivePastDark: {
    backgroundColor: '#1E293B',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActivePurple: {
    color: '#7C3AED',
  },
  tabBtnTextActiveOrange: {
    color: '#EA580C',
  },
  tabBadgePurple: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeTextPurple: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  tabBadgeOrange: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeTextOrange: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
  },

  // Scheduled Trip Specific Card Styles
  tripCardScheduled: {
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    backgroundColor: '#FDFCFE',
  },
  tripCardScheduledDark: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: '#1E1E2E',
  },
  scheduledCardInfoBox: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  scheduledCardInfoBoxDark: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  scheduledCardInfoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    textTransform: 'uppercase',
  },
  scheduledCardInfoText: {
    fontSize: 11,
    color: '#6D28D9',
    marginTop: 2,
    lineHeight: 15,
  },
  cancelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelActionBtnDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelActionText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
