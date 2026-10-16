import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  Clock,
  Navigation,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Zap,
  MapPin,
  Briefcase,
  Camera,
  ShoppingBag,
} from 'lucide-react-native';

export interface HourlyPackage {
  id: string;
  hours: number;
  distanceKm: number;
  uberPrice: number;
  orangePrice: number;
  badge?: string;
  tagline: string;
}

export const HOURLY_PACKAGES: HourlyPackage[] = [
  {
    id: '1h',
    hours: 1,
    distanceKm: 10,
    uberPrice: 400,
    orangePrice: 360,
    tagline: 'Quick errands, meetings & single appointments',
  },
  {
    id: '2h',
    hours: 2,
    distanceKm: 20,
    uberPrice: 720,
    orangePrice: 649,
    tagline: 'Doctor visits, shopping & quick city tasks',
  },
  {
    id: '3h',
    hours: 3,
    distanceKm: 30,
    uberPrice: 1050,
    orangePrice: 945,
    tagline: 'Multiple errands across town with stops',
  },
  {
    id: '4h',
    hours: 4,
    distanceKm: 40,
    uberPrice: 1380,
    orangePrice: 1240,
    badge: 'MOST POPULAR',
    tagline: 'Half-day business meetings & client visits',
  },
  {
    id: '5h',
    hours: 5,
    distanceKm: 50,
    uberPrice: 1700,
    orangePrice: 1530,
    tagline: 'Extended half-day with flexible stops',
  },
  {
    id: '6h',
    hours: 6,
    distanceKm: 60,
    uberPrice: 2020,
    orangePrice: 1819,
    tagline: 'Multi-location corporate visits & shopping',
  },
  {
    id: '8h',
    hours: 8,
    distanceKm: 80,
    uberPrice: 2680,
    orangePrice: 2410,
    badge: 'BEST VALUE',
    tagline: 'Full-day city disposal (8 hours / 80 km)',
  },
  {
    id: '10h',
    hours: 10,
    distanceKm: 100,
    uberPrice: 3350,
    orangePrice: 3015,
    tagline: 'Full-day comprehensive travel & events',
  },
  {
    id: '12h',
    hours: 12,
    distanceKm: 120,
    uberPrice: 4000,
    orangePrice: 3600,
    badge: 'MAX DISPOSAL',
    tagline: 'Full-day VIP disposal for weddings & outstation',
  },
];

interface HourlyRentalModalProps {
  visible: boolean;
  onClose: () => void;
  pickupText: string;
  onChangePickup?: () => void;
  onConfirmRental: (pkg: HourlyPackage) => Promise<void> | void;
  loading?: boolean;
  theme?: 'light' | 'dark';
}

export function HourlyRentalModal({
  visible,
  onClose,
  pickupText,
  onChangePickup,
  onConfirmRental,
  loading = false,
  theme = 'light',
}: HourlyRentalModalProps) {
  const isDark = theme === 'dark';
  const [selectedIdx, setSelectedIdx] = useState(3); // Default 4h (Most Popular)
  const currentPkg = HOURLY_PACKAGES[selectedIdx] || HOURLY_PACKAGES[0];

  const handleSelectPackage = (idx: number) => {
    Haptics.selectionAsync();
    setSelectedIdx(idx);
  };

  const handleBookPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onConfirmRental(currentPkg);
  };

  const savings = currentPkg.uberPrice - currentPkg.orangePrice;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Grabber */}
          <View style={styles.grabber} />

          {/* Minimal Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View>
              <Text style={[styles.title, isDark && styles.textWhite]}>Hourly Rentals</Text>
              <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>
                Mahindra BE.6 Signature & Chauffeur at your disposal
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
            {/* 1. SHORT "WHAT IS IT & WHO IT'S FOR" BRIEFING (MINIMALIST) */}
            <View style={[styles.introCard, isDark && styles.introCardDark]}>
              <Text style={[styles.introHeading, isDark && styles.textWhite]}>
                Book a cab with driver for up to 12 hours with unlimited stops.
              </Text>

              {/* Clean Use Case Pills */}
              <View style={styles.useCaseRow}>
                <View style={[styles.useCasePill, isDark && styles.useCasePillDark]}>
                  <Briefcase size={12} color="#F97316" />
                  <Text style={[styles.useCaseText, isDark && styles.textWhite]}>Business Meetings</Text>
                </View>
                <View style={[styles.useCasePill, isDark && styles.useCasePillDark]}>
                  <Camera size={12} color="#10B981" />
                  <Text style={[styles.useCaseText, isDark && styles.textWhite]}>City Tourists</Text>
                </View>
                <View style={[styles.useCasePill, isDark && styles.useCasePillDark]}>
                  <ShoppingBag size={12} color="#3B82F6" />
                  <Text style={[styles.useCaseText, isDark && styles.textWhite]}>Shopping</Text>
                </View>
              </View>
            </View>

            {/* 2. HORIZONTAL SCROLL TO SELECT NO OF HOURS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, isDark && styles.textMutedDark]}>
                SELECT DURATION
              </Text>
              <Text style={styles.sectionSub}>Scroll sideways ➔</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hoursScroll}
            >
              {HOURLY_PACKAGES.map((pkg, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.hourPill,
                      isDark && styles.hourPillDark,
                      isSelected && styles.hourPillActive,
                      isSelected && isDark && styles.hourPillActiveDark,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSelectPackage(idx)}
                  >
                    {pkg.badge && (
                      <View style={[styles.pkgBadge, isSelected ? styles.pkgBadgeActive : null]}>
                        <Text style={styles.pkgBadgeText}>{pkg.badge}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.hourNumber,
                        isDark && styles.textWhite,
                        isSelected && styles.hourNumberActive,
                      ]}
                    >
                      {pkg.hours} {pkg.hours === 1 ? 'Hour' : 'Hours'}
                    </Text>
                    <Text style={[styles.hourKm, isDark && styles.textMutedDark, isSelected && styles.hourKmActive]}>
                      {pkg.distanceKm} km included
                    </Text>
                    <View style={styles.pillPriceRow}>
                      <Text
                        style={[
                          styles.pillPrice,
                          isDark && styles.textWhite,
                          isSelected && styles.pillPriceActive,
                        ]}
                      >
                        ₹{pkg.orangePrice}
                      </Text>
                      <Text style={styles.pillUberPrice}>₹{pkg.uberPrice}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3. ACTIVE PACKAGE PRICING & SUMMARY */}
            <View style={[styles.packageCard, isDark && styles.packageCardDark]}>
              <View style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.packageCardTitle, isDark && styles.textWhite]}>
                    {currentPkg.hours} Hours · {currentPkg.distanceKm} km Package
                  </Text>
                  <Text style={[styles.packageTagline, isDark && styles.textMutedDark]}>
                    {currentPkg.tagline}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={styles.priceMain}>₹{currentPkg.orangePrice}</Text>
                  <Text style={styles.priceStrike}>Uber: ₹{currentPkg.uberPrice}</Text>
                </View>
              </View>

              {/* 10% Less than Uber Banner */}
              <View style={styles.uberDiscountPill}>
                <Zap size={13} color="#15803D" />
                <Text style={styles.uberDiscountText}>
                  10% less than Uber Rentals (You save ₹{savings})
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Package Highlights Grid */}
              <View style={styles.perksRow}>
                <View style={styles.perkItem}>
                  <Clock size={15} color="#F97316" />
                  <Text style={[styles.perkLabel, isDark && styles.textWhite]}>{currentPkg.hours}h Waiting</Text>
                </View>
                <View style={styles.perkItem}>
                  <Navigation size={15} color="#3B82F6" />
                  <Text style={[styles.perkLabel, isDark && styles.textWhite]}>{currentPkg.distanceKm} km Included</Text>
                </View>
                <View style={styles.perkItem}>
                  <RotateCcw size={15} color="#10B981" />
                  <Text style={[styles.perkLabel, isDark && styles.textWhite]}>Unlimited Stops</Text>
                </View>
              </View>

              {/* Compact Extra Usage Notice */}
              <Text style={[styles.extraNoticeText, isDark && styles.textMutedDark]}>
                Extra: ₹14/km · ₹2.5/min beyond package · Tolls & parking at actuals
              </Text>
            </View>

            {/* 4. COMPACT PICKUP ROW (ONLY PICKUP REQUIRED) */}
            <TouchableOpacity
              style={[styles.pickupCard, isDark && styles.pickupCardDark]}
              activeOpacity={0.8}
              onPress={() => {
                if (onChangePickup) {
                  Haptics.selectionAsync();
                  onChangePickup();
                }
              }}
            >
              <View style={styles.pickupDot} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.pickupLabel, isDark && styles.textMutedDark]}>
                  CHAUFFEUR PICKUP (NO DROP-OFF DESTINATION NEEDED)
                </Text>
                <Text style={[styles.pickupValue, isDark && styles.textWhite]} numberOfLines={1}>
                  {pickupText || 'Indiranagar, Bengaluru'}
                </Text>
              </View>
              {onChangePickup && (
                <Text style={styles.changePickupBtn}>Change</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Bottom Fixed Action Footer */}
          <View style={[styles.footer, isDark && styles.footerDark]}>
            <View>
              <Text style={[styles.footerPrice, isDark && styles.textWhite]}>
                ₹{currentPkg.orangePrice}
              </Text>
              <Text style={styles.footerSub}>
                {currentPkg.hours}h / {currentPkg.distanceKm}km package
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.88}
              onPress={handleBookPress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.bookBtnText}>
                    Book {currentPkg.hours}h Rental · ₹{currentPkg.orangePrice}
                  </Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
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
    shadowRadius: 14,
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
    paddingTop: 12,
  },
  introCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  introCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  introHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 8,
  },
  useCaseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  useCasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  useCasePillDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  useCaseText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  sectionSub: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '700',
  },
  hoursScroll: {
    gap: 10,
    paddingBottom: 14,
  },
  hourPill: {
    width: 120,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  hourPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  hourPillActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  hourPillActiveDark: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  pkgBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#64748B',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pkgBadgeActive: {
    backgroundColor: '#F97316',
  },
  pkgBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hourNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  hourNumberActive: {
    color: '#EA580C',
  },
  hourKm: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  hourKmActive: {
    color: '#EA580C',
  },
  pillPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  pillPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pillPriceActive: {
    color: '#EA580C',
  },
  pillUberPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  packageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  packageCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  packageCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  packageTagline: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  priceMain: {
    fontSize: 20,
    fontWeight: '900',
    color: '#EA580C',
  },
  priceStrike: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  uberDiscountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  uberDiscountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  perksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  perkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  extraNoticeText: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
  pickupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickupCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  pickupLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  pickupValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  changePickupBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerDark: {
    borderTopColor: '#1E293B',
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  footerSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  bookBtn: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
