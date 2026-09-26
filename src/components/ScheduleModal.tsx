import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  Calendar,
  Clock,
  Check,
  ShieldCheck,
  Zap,
  Snowflake,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSchedule: (date: Date) => void;
  onClearSchedule?: () => void;
  currentSchedule?: Date | null;
  theme?: 'light' | 'dark';
}

interface DayOption {
  date: Date;
  label: string;
  subLabel: string;
  isToday: boolean;
}

export function ScheduleModal({
  visible,
  onClose,
  onConfirmSchedule,
  onClearSchedule,
  currentSchedule,
  theme = 'light',
}: ScheduleModalProps) {
  const isDark = theme === 'dark';

  // Compute the next 7 days
  const [days, setDays] = useState<DayOption[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Time slots in 15-minute intervals
  const [selectedHour, setSelectedHour] = useState(9); // 0-23
  const [selectedMinute, setSelectedMinute] = useState(0); // 0, 15, 30, 45

  useEffect(() => {
    const list: DayOption[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;

      let label = isToday
        ? 'Today'
        : isTomorrow
        ? 'Tomorrow'
        : d.toLocaleDateString('en-IN', { weekday: 'short' });

      let subLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      list.push({ date: d, label, subLabel, isToday });
    }

    setDays(list);

    if (currentSchedule) {
      // Find matching day
      const targetDay = currentSchedule.getDate();
      const idx = list.findIndex((item) => item.date.getDate() === targetDay);
      if (idx >= 0) setSelectedDayIdx(idx);
      setSelectedHour(currentSchedule.getHours());
      setSelectedMinute(Math.round(currentSchedule.getMinutes() / 15) * 15 % 60);
    } else {
      // Default to 1 hour from now or 9 AM tomorrow
      const future = new Date(now.getTime() + 60 * 60 * 1000);
      setSelectedHour(future.getHours());
      setSelectedMinute(Math.ceil(future.getMinutes() / 15) * 15 % 60);
    }
  }, [visible, currentSchedule]);

  function getComputedDate(): Date {
    const chosenDay = days[selectedDayIdx]?.date || new Date();
    const result = new Date(chosenDay);
    result.setHours(selectedHour);
    result.setMinutes(selectedMinute);
    result.setSeconds(0);
    result.setMilliseconds(0);
    return result;
  }

  function formatTimeDisplay(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMin = minute < 10 ? `0${minute}` : `${minute}`;
    return `${displayHour}:${displayMin} ${period}`;
  }

  function handleConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const chosen = getComputedDate();
    onConfirmSchedule(chosen);
    onClose();
  }

  function handleClear() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onClearSchedule?.();
    onClose();
  }

  const computedDate = getComputedDate();
  const chosenDay = days[selectedDayIdx];
  const dateFormattedSummary = chosenDay
    ? `${chosenDay.label} (${chosenDay.subLabel}) at ${formatTimeDisplay(selectedHour, selectedMinute)}`
    : '';

  // Common popular time slots
  const popularTimes = [
    { hour: 7, minute: 0 },
    { hour: 8, minute: 30 },
    { hour: 9, minute: 0 },
    { hour: 10, minute: 0 },
    { hour: 12, minute: 30 },
    { hour: 14, minute: 0 },
    { hour: 17, minute: 30 },
    { hour: 19, minute: 0 },
    { hour: 20, minute: 30 },
    { hour: 22, minute: 0 },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIconWrap}>
                <Clock size={20} color="#F97316" />
              </View>
              <View>
                <Text style={[styles.title, isDark && styles.textWhite]}>Schedule a Ride</Text>
                <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>
                  Reserve an EV chauffeur up to 7 days ahead
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, isDark && styles.closeBtnDark]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* 1. DATE PICKER PILLS */}
            <Text style={[styles.sectionTitle, isDark && styles.textMutedDark]}>
              SELECT PICKUP DATE
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
              {days.map((item, idx) => {
                const isSelected = idx === selectedDayIdx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayPill,
                      isDark && styles.dayPillDark,
                      isSelected && styles.dayPillActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedDayIdx(idx);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        isDark && styles.textWhite,
                        isSelected && styles.dayLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.daySubLabel,
                        isDark && styles.textMutedDark,
                        isSelected && styles.daySubLabelActive,
                      ]}
                    >
                      {item.subLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2. TIME PICKER */}
            <Text style={[styles.sectionTitle, isDark && styles.textMutedDark, { marginTop: 18 }]}>
              SELECT PICKUP TIME
            </Text>

            {/* Selected Time Display Pill */}
            <View style={[styles.timeDisplayCard, isDark && styles.timeDisplayCardDark]}>
              <View style={styles.timeDisplayInner}>
                <Clock size={20} color="#F97316" />
                <Text style={[styles.timeDisplayText, isDark && styles.textWhite]}>
                  {formatTimeDisplay(selectedHour, selectedMinute)}
                </Text>
              </View>

              {/* Incremental Adjusters */}
              <View style={styles.timeAdjustersRow}>
                <TouchableOpacity
                  style={[styles.adjustBtn, isDark && styles.adjustBtnDark]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedHour((prev) => (prev === 0 ? 23 : prev - 1));
                  }}
                >
                  <Text style={[styles.adjustBtnText, isDark && styles.textWhite]}>-1h</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.adjustBtn, isDark && styles.adjustBtnDark]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedHour((prev) => (prev === 23 ? 0 : prev + 1));
                  }}
                >
                  <Text style={[styles.adjustBtnText, isDark && styles.textWhite]}>+1h</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.adjustBtn, isDark && styles.adjustBtnDark]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedMinute((prev) => (prev + 15) % 60);
                  }}
                >
                  <Text style={[styles.adjustBtnText, isDark && styles.textWhite]}>+15m</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Popular Times */}
            <Text style={[styles.microLabel, isDark && styles.textMutedDark]}>
              POPULAR DEPARTURE SLOTS
            </Text>
            <View style={styles.slotsGrid}>
              {popularTimes.map((slot, idx) => {
                const isSelected = selectedHour === slot.hour && selectedMinute === slot.minute;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.slotPill,
                      isDark && styles.slotPillDark,
                      isSelected && styles.slotPillActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedHour(slot.hour);
                      setSelectedMinute(slot.minute);
                    }}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        isDark && styles.textWhite,
                        isSelected && styles.slotTextActive,
                      ]}
                    >
                      {formatTimeDisplay(slot.hour, slot.minute)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. ASSURANCES NOTE */}
            <View style={[styles.assuranceCard, isDark && styles.assuranceCardDark]}>
              <View style={styles.assuranceRow}>
                <ShieldCheck size={16} color="#10B981" />
                <Text style={[styles.assuranceText, isDark && styles.textWhite]}>
                  <Text style={{ fontWeight: '800' }}>100% Zero-Surge Guarantee:</Text> Your scheduled fare is locked.
                </Text>
              </View>
              <View style={styles.assuranceRow}>
                <Snowflake size={16} color="#38BDF8" />
                <Text style={[styles.assuranceText, isDark && styles.textWhite]}>
                  <Text style={{ fontWeight: '800' }}>Early Chauffeur Arrival:</Text> Chauffeur arrives 10 mins early with pre-cooled AC.
                </Text>
              </View>
              <View style={styles.assuranceRow}>
                <Zap size={16} color="#F97316" />
                <Text style={[styles.assuranceText, isDark && styles.textWhite]}>
                  <Text style={{ fontWeight: '800' }}>Free Cancellation:</Text> Cancel penalty-free anytime before driver dispatch.
                </Text>
              </View>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.footer, isDark && styles.footerDark]}>
            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.88}
              onPress={handleConfirm}
            >
              <Calendar size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText} numberOfLines={1}>
                Schedule for {dateFormattedSummary}
              </Text>
            </TouchableOpacity>

            {currentSchedule && (
              <TouchableOpacity
                style={[styles.clearBtn, isDark && styles.clearBtnDark]}
                activeOpacity={0.8}
                onPress={handleClear}
              >
                <RotateCcw size={14} color="#EA580C" />
                <Text style={styles.clearBtnText}>Switch to Ride Now (Instant)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  cardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerDark: {
    borderBottomColor: '#1E293B',
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  closeBtnDark: {
    backgroundColor: '#1E293B',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  daysScroll: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  dayPill: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginHorizontal: 4,
    alignItems: 'center',
    minWidth: 84,
  },
  dayPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  dayPillActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  dayLabelActive: {
    color: '#EA580C',
  },
  daySubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  daySubLabelActive: {
    color: '#F97316',
  },
  timeDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeDisplayCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  timeDisplayInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeDisplayText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeAdjustersRow: {
    flexDirection: 'row',
    gap: 6,
  },
  adjustBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  adjustBtnDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  adjustBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  microLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  slotPillActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  slotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  slotTextActive: {
    color: '#EA580C',
  },
  assuranceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assuranceCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  assuranceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  assuranceText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  footerDark: {
    borderTopColor: '#1E293B',
  },
  confirmBtn: {
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  clearBtn: {
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clearBtnDark: {},
  clearBtnText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '700',
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
