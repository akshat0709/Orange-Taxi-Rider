import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSchedule: (date: Date) => void;
  onClearSchedule?: () => void;
  currentSchedule?: Date | null;
  pickupText?: string;
  dropLocation?: { name: string; lat: number; lng: number } | null;
  onChangePickup?: () => void;
  onChangeDrop?: () => void;
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
  pickupText,
  dropLocation,
  onChangePickup,
  onChangeDrop,
  theme = 'light',
}: ScheduleModalProps) {
  const isDark = theme === 'dark';

  // Compute the next 7 days
  const [days, setDays] = useState<DayOption[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Time in hours (0-23) and minutes (0, 15, 30, 45)
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

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
      const targetDay = currentSchedule.getDate();
      const idx = list.findIndex((item) => item.date.getDate() === targetDay);
      if (idx >= 0) setSelectedDayIdx(idx);
      setSelectedHour(currentSchedule.getHours());
      setSelectedMinute(Math.round(currentSchedule.getMinutes() / 15) * 15 % 60);
    } else {
      const future = new Date(now.getTime() + 60 * 60 * 1000);
      setSelectedHour(future.getHours());
      setSelectedMinute(Math.ceil(future.getMinutes() / 15) * 15 % 60);
    }
  }, [visible, currentSchedule]);

  function formatTimeDisplay(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMin = minute < 10 ? `0${minute}` : `${minute}`;
    return `${displayHour}:${displayMin} ${period}`;
  }

  // Generate 15-minute time slots (00:00 to 23:45)
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string }[] = [];
    const isToday = selectedDayIdx === 0;
    const now = new Date();
    const currentTotalMin = now.getHours() * 60 + now.getMinutes() + 15; // At least 15 min from now

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const slotTotalMin = h * 60 + m;
        if (isToday && slotTotalMin < currentTotalMin) {
          continue;
        }
        slots.push({
          hour: h,
          minute: m,
          label: formatTimeDisplay(h, m),
        });
      }
    }
    return slots;
  }, [selectedDayIdx]);

  function getComputedDate(): Date {
    const chosenDay = days[selectedDayIdx]?.date || new Date();
    const result = new Date(chosenDay);
    result.setHours(selectedHour);
    result.setMinutes(selectedMinute);
    result.setSeconds(0);
    result.setMilliseconds(0);
    return result;
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

  const chosenDay = days[selectedDayIdx];
  const dateFormattedSummary = chosenDay
    ? `${chosenDay.label}, ${formatTimeDisplay(selectedHour, selectedMinute)}`
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Grabber */}
          <View style={styles.grabber} />

          {/* Minimal Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View>
              <Text style={[styles.title, isDark && styles.textWhite]}>Reserve a Ride</Text>
              <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>
                Advance booking up to 7 days
              </Text>
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
            {/* Minimalist Route Card */}
            <View style={[styles.routeCard, isDark && styles.routeCardDark]}>
              <TouchableOpacity
                style={styles.routeRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                  onChangePickup?.();
                }}
              >
                <View style={styles.dotGreen} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.routeLabel, isDark && styles.textMutedDark]}>PICKUP</Text>
                  <Text style={[styles.routeValue, isDark && styles.textWhite]} numberOfLines={1}>
                    {pickupText || 'Current location'}
                  </Text>
                </View>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>

              <View style={[styles.routeDivider, isDark && styles.routeDividerDark]} />

              <TouchableOpacity
                style={styles.routeRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                  onChangeDrop?.();
                }}
              >
                <View style={[styles.dotOrange, !dropLocation && styles.dotEmpty]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.routeLabel, isDark && styles.textMutedDark]}>DESTINATION</Text>
                  <Text
                    style={[
                      styles.routeValue,
                      isDark && styles.textWhite,
                      !dropLocation && { color: '#F97316', fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {dropLocation ? dropLocation.name : 'Select destination →'}
                  </Text>
                </View>
                <Text style={[styles.editLink, !dropLocation && { color: '#F97316' }]}>
                  {dropLocation ? 'Edit' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1. DATE SCROLL */}
            <Text style={[styles.sectionTitle, isDark && styles.textMutedDark]}>
              SELECT DATE
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
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

            {/* 2. TIME SCROLL */}
            <View style={styles.timeSectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textMutedDark]}>
                SELECT TIME
              </Text>
              <Text style={styles.selectedTimeBadge}>
                {formatTimeDisplay(selectedHour, selectedMinute)}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeScroll}
            >
              {timeSlots.map((slot) => {
                const isSelected = selectedHour === slot.hour && selectedMinute === slot.minute;
                return (
                  <TouchableOpacity
                    key={`${slot.hour}-${slot.minute}`}
                    style={[
                      styles.timeSlotPill,
                      isDark && styles.timeSlotPillDark,
                      isSelected && styles.timeSlotPillActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedHour(slot.hour);
                      setSelectedMinute(slot.minute);
                    }}
                  >
                    <Clock size={12} color={isSelected ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} />
                    <Text
                      style={[
                        styles.timeSlotText,
                        isDark && styles.textWhite,
                        isSelected && styles.timeSlotTextActive,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Minimalist 1-line Assurance */}
            <View style={[styles.assurancePill, isDark && styles.assurancePillDark]}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={[styles.assuranceText, isDark && styles.textMutedDark]}>
                Chauffeur arrives 10m early · Free to cancel until a driver accepts
              </Text>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Bottom Confirm Action */}
          <View style={[styles.footer, isDark && styles.footerDark]}>
            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.88}
              onPress={handleConfirm}
            >
              <Calendar size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText} numberOfLines={1}>
                Confirm for {dateFormattedSummary}
              </Text>
            </TouchableOpacity>

            {currentSchedule && (
              <TouchableOpacity
                style={[styles.clearBtn, isDark && styles.clearBtnDark]}
                activeOpacity={0.8}
                onPress={handleClear}
              >
                <RotateCcw size={13} color="#EA580C" />
                <Text style={styles.clearBtnText}>Switch to Ride Now</Text>
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
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  cardDark: {
    backgroundColor: '#0F172A',
    borderTopColor: '#1E293B',
    borderTopWidth: 1,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerDark: {
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#1E293B',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  routeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  routeCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  dotOrange: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  dotEmpty: {
    backgroundColor: '#94A3B8',
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  routeDividerDark: {
    backgroundColor: '#334155',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  daysScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minWidth: 78,
  },
  dayPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  dayPillActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayLabelActive: {
    color: '#FFFFFF',
  },
  daySubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  daySubLabelActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedTimeBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
  },
  timeScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  timeSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSlotPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  timeSlotPillActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeSlotTextActive: {
    color: '#FFFFFF',
  },
  assurancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  assurancePillDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  assuranceText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  clearBtnDark: {},
  clearBtnText: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '700',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
