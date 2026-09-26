import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Star, CheckCircle, X, Sparkles, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

interface RatingModalProps {
  visible: boolean;
  bookingId: string;
  driverId?: string | null;
  driverName: string;
  vehicleName: string;
  onDismiss: () => void;
  onRatingSubmitted?: (newRating: number, totalRides: number) => void;
  theme?: 'light' | 'dark';
}

const COMPLIMENT_OPTIONS = [
  '🌟 Smooth & Safe Driving',
  '❄️ Chilled Pre-Cooled AC',
  '✨ Spotless EV Cabin',
  '🤝 Courteous Driver',
  '⚡ Fast & Direct Route',
];

const STAR_LABELS: Record<number, string> = {
  1: 'Disappointing 😞',
  2: 'Needs Improvement 😐',
  3: 'Good Ride 🙂',
  4: 'Very Good! 😊',
  5: 'Exceptional Experience! 🌟',
};

export function RatingModal({
  visible,
  bookingId,
  driverId,
  driverName,
  vehicleName,
  onDismiss,
  onRatingSubmitted,
  theme = 'light',
}: RatingModalProps) {
  const isDark = theme === 'dark';
  const [rating, setRating] = useState<number>(5);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleChip(chip: string) {
    Haptics.selectionAsync();
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  }

  async function handleSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);

    try {
      const fullReview = [
        ...selectedChips,
        reviewText.trim(),
      ].filter(Boolean).join(' · ');

      // 1. Update Supabase bookings table with rating and review
      await supabase
        .from('bookings')
        .update({
          rating,
          review: fullReview,
        })
        .eq('id', bookingId);

      // 2. Recalculate and update driver rating & total completed rides
      let newAvgRating = rating;
      let newTotalRides = 1;

      let resolvedDriverId = driverId;
      if (!resolvedDriverId && bookingId) {
        try {
          const { data: b } = await supabase
            .from('bookings')
            .select('driver_id')
            .eq('id', bookingId)
            .maybeSingle();
          if (b?.driver_id) resolvedDriverId = b.driver_id;
        } catch (e) {}
      }

      if (resolvedDriverId) {
        try {
          const [{ data: ratedBookings }, { count: completedCount }] = await Promise.all([
            supabase
              .from('bookings')
              .select('id, rating')
              .eq('driver_id', resolvedDriverId)
              .not('rating', 'is', null),
            supabase
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .eq('driver_id', resolvedDriverId)
              .eq('status', 'completed'),
          ]);

          const otherRatings = (ratedBookings || [])
            .filter((b: any) => b.id !== bookingId && b.rating)
            .map((b: any) => Number(b.rating));
          otherRatings.push(rating);

          newAvgRating = Number(
            (otherRatings.reduce((a, b) => a + b, 0) / otherRatings.length).toFixed(1)
          );
          newTotalRides = Math.max(completedCount || 0, otherRatings.length, 1);

          await supabase
            .from('drivers')
            .update({
              rating: newAvgRating,
              total_rides: newTotalRides,
            })
            .eq('id', resolvedDriverId);

          onRatingSubmitted?.(newAvgRating, newTotalRides);
        } catch (e) {
          console.warn('Driver aggregate update notice in app:', e);
        }
      }

      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        onDismiss();
      }, 1500);
    } catch (err) {
      console.warn('Rating submit notice:', err);
      onDismiss();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {submitted ? (
            <View style={styles.successBox}>
              <CheckCircle size={48} color="#22C55E" />
              <Text style={[styles.successTitle, isDark && styles.textWhite]}>Thank You!</Text>
              <Text style={[styles.successSub, isDark && styles.textMutedDark]}>Your feedback helps Orange maintain India's finest fleet.</Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={[styles.title, isDark && styles.textWhite]}>Rate Your Journey</Text>
                  <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>
                    {driverName} · {vehicleName}
                  </Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, isDark && styles.closeBtnDark]}>
                  <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Stars */}
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setRating(star);
                    }}
                    style={styles.starBtn}
                  >
                    <Star
                      size={36}
                      color="#F59E0B"
                      fill={star <= rating ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.starFeedback}>{STAR_LABELS[rating]}</Text>

              {/* Compliments Chips */}
              <Text style={[styles.chipHeader, isDark && styles.textMutedDark]}>WHAT MADE YOUR TRIP GREAT?</Text>
              <View style={styles.chipsRow}>
                {COMPLIMENT_OPTIONS.map((chip) => {
                  const isSelected = selectedChips.includes(chip);
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[
                        styles.chip,
                        isDark && styles.chipDark,
                        isSelected && (isDark ? styles.chipActiveDark : styles.chipActive),
                      ]}
                      onPress={() => toggleChip(chip)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isDark && styles.textMutedDark,
                          isSelected && (isDark ? styles.chipTextActiveDark : styles.chipTextActive),
                        ]}
                      >
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional Text Review */}
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                placeholder="Add private note for Orange Safety & Chauffeur team (optional)..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                numberOfLines={3}
                value={reviewText}
                onChangeText={setReviewText}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                disabled={submitting}
                onPress={handleSubmit}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Experience</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  cardDark: {
    backgroundColor: '#141820',
    borderColor: '#232936',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  subTitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  closeBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 18,
  },
  starBtn: {
    padding: 4,
  },
  starFeedback: {
    color: '#F59E0B',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  chipHeader: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipDark: {
    backgroundColor: '#0F1218',
    borderColor: '#232936',
  },
  chipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  chipActiveDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderColor: '#F97316',
  },
  chipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#C2410C',
    fontWeight: '800',
  },
  chipTextActiveDark: {
    color: '#F97316',
    fontWeight: '800',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
    height: 70,
    marginBottom: 16,
  },
  textInputDark: {
    backgroundColor: '#0F1218',
    borderColor: '#232936',
    color: '#F8FAFC',
  },
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  successSub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
