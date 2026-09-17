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
  driverName: string;
  vehicleName: string;
  onDismiss: () => void;
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
  driverName,
  vehicleName,
  onDismiss,
}: RatingModalProps) {
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

      // Update Supabase bookings table with rating and review
      await supabase
        .from('bookings')
        .update({
          rating,
          review: fullReview,
        })
        .eq('id', bookingId);

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
        <View style={styles.card}>
          {submitted ? (
            <View style={styles.successBox}>
              <CheckCircle size={48} color="#22C55E" />
              <Text style={styles.successTitle}>Thank You!</Text>
              <Text style={styles.successSub}>Your feedback helps Orange maintain India's finest fleet.</Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Rate Your Journey</Text>
                  <Text style={styles.subTitle}>
                    {driverName} · {vehicleName}
                  </Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                  <X size={18} color="#9CA3AF" />
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
              <Text style={styles.chipHeader}>WHAT MADE YOUR TRIP GREAT?</Text>
              <View style={styles.chipsRow}>
                {COMPLIMENT_OPTIONS.map((chip) => {
                  const isSelected = selectedChips.includes(chip);
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => toggleChip(chip)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional Text Review */}
              <TextInput
                style={styles.textInput}
                placeholder="Add private note for Orange Safety & Chauffeur team (optional)..."
                placeholderTextColor="#6B7280"
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#141820',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#232936',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  subTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
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
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
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
    backgroundColor: '#0F1218',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232936',
  },
  chipActive: {
    backgroundColor: 'rgba(245, 107, 0, 0.15)',
    borderColor: '#F56B00',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#F56B00',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#0F1218',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#232936',
    textAlignVertical: 'top',
    height: 70,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#F56B00',
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
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  successSub: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
