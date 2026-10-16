import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  Clock,
  Navigation,
  ShieldCheck,
  Check,
  Sparkles,
  ChevronRight,
  Zap,
  MapPin,
  Car,
  RotateCcw,
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
    uberPrice: 310,
    orangePrice: 279,
    tagline: 'Quick errands & short meetings',
  },
  {
    id: '2h',
    hours: 2,
    distanceKm: 20,
    uberPrice: 570,
    orangePrice: 519,
    tagline: 'Doctor visits & shopping trips',
  },
  {
    id: '3h',
    hours: 3,
    distanceKm: 30,
    uberPrice: 820,
    orangePrice: 739,
    tagline: 'Multiple errands across town',
  },
  {
    id: '4h',
    hours: 4,
    distanceKm: 40,
    uberPrice: 1080,
    orangePrice: 969,
    badge: 'MOST POPULAR',
    tagline: 'Half-day city tour or business client meetings',
  },
  {
    id: '5h',
    hours: 5,
    distanceKm: 50,
    uberPrice: 1330,
    orangePrice: 1199,
    tagline: 'Extended half-day with flexible stops',
  },
  {
    id: '6h',
    hours: 6,
    distanceKm: 60,
    uberPrice: 1580,
    orangePrice: 1419,
    tagline: 'Multi-location corporate visits',
  },
  {
    id: '8h',
    hours: 8,
    distanceKm: 80,
    uberPrice: 2080,
    orangePrice: 1869,
    badge: 'BEST VALUE',
    tagline: 'Full-day executive disposal (8 hours / 80 km)',
  },
  {
    id: '10h',
    hours: 10,
    distanceKm: 100,
    uberPrice: 2580,
    orangePrice: 2319,
    tagline: 'Full-day comprehensive travel',
  },
  {
    id: '12h',
    hours: 12,
    distanceKm: 120,
    uberPrice: 3080,
    orangePrice: 2769,
    badge: 'MAX DISPOSAL',
    tagline: 'Full day outstation / city VIP chauffeuring',
  },
];

interface HourlyRentalModalProps {
  visible: boolean;
  onClose: () => void;
  pickupText: string;
  onConfirmRental: (pkg: HourlyPackage) => Promise<void> | void;
  loading?: boolean;
  theme?: 'light' | 'dark';
}

export function HourlyRentalModal({
  visible,
  onClose,
  pickupText,
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

          {/* Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIconWrap}>
                <Clock size={20} color="#F97316" />
              </View>
              <View>
                <Text style={[styles.title, isDark && styles.textWhite]}>Hourly Rentals</Text>
                <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>
                  Mahindra BE.6 Signature at your disposal
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
            {/* 1. HORIZONTAL SCROLL TO SELECT NO OF HOURS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, isDark && styles.textMutedDark]}>
                SELECT NUMBER OF HOURS
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

            {/* 2. ACTIVE PACKAGE PRICING & VALUE COMPARISON CARD */}
            <View style={[styles.packageCard, isDark && styles.packageCardDark]}>
              <View style={styles.priceRow}>
                <View>
                  <Text style={[styles.packageCardTitle, isDark && styles.textWhite]}>
                    {currentPkg.hours} Hours · {currentPkg.distanceKm} km Package
                  </Text>
                  <Text style={[styles.packageTagline, isDark && styles.textMutedDark]}>
                    {currentPkg.tagline}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
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
                  <Clock size={16} color="#F97316" />
                  <Text style={[styles.perkLabel, isDark && styles.textWhite]}>{currentPkg.hours}h Free Waiting</Text>
                </View>
                <View style={styles.perkItem}>
                  <Navigation size={16} color="#3B82F6" />
                  <Text style={[styles.perkLabel, isDark && styles.textWhite]}>{currentPkg.distanceKm} km Included</Text>
                </View>
                <View style={styles.perkItem}>
                  <RotateCcw size={16} color="#10B981" />
                  <Text style={[styles.perkLabel, isDark && styles.textWhite]}>Unlimited Stops</Text>
                </View>
              </View>

              {/* Extra Usage Notice */}
              <View style={[styles.extraNoticeBox, isDark && styles.extraNoticeBoxDark]}>
                <Text style={[styles.extraNoticeText, isDark && styles.textMutedDark]}>
                  • Extra Distance: <Text style={{ fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A' }}>₹14/km</Text> beyond {currentPkg.distanceKm} km{'\n'}
                  • Extra Time: <Text style={{ fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A' }}>₹2.5/min</Text> beyond {currentPkg.hours} hours{'\n'}
                  • Tolls, state taxes & parking charged at actuals
                </Text>
              </View>
            </View>

            {/* 3. PICKUP SPOT CARD */}
            <View style={[styles.pickupCard, isDark && styles.pickupCardDark]}>
              <View style={styles.pickupDot} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.pickupLabel, isDark && styles.textMutedDark]}>CHAUFFEUR PICKUP LOCATION</Text>
                <Text style={[styles.pickupValue, isDark && styles.textWhite]} numberOfLines={1}>
                  {pickupText || 'Indiranagar 100ft Road, Bengaluru'}
                </Text>
              </View>
            </View>

            {/* 4. MAHINDRA BE.6 VEHICLE SHOWCASE */}
            <View style={[styles.vehicleCard, isDark && styles.vehicleCardDark]}>
              <View style={styles.vehicleImgBox}>
                <Image
                  source={require('../../assets/be6-exterior.jpg')}
                  style={styles.vehicleImg}
                  resizeMode="cover"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.vehicleTitle, isDark && styles.textWhite]}>
                    Mahindra BE.6 Signature
                  </Text>
                </View>
                <Text style={[styles.vehicleDesc, isDark && styles.textMutedDark]}>
                  100% Pure Electric EV · Spotless Executive Interior · Pre-Cooled AC at 22°C
                </Text>
                <View style={styles.verifiedRow}>
                  <ShieldCheck size={13} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified Chauffeur</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 24 }} />
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
                    Book {currentPkg.hours} Hr Rental · ₹{currentPkg.orangePrice}
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
    maxHeight: '92%',
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
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '600',
  },
  hoursScroll: {
    gap: 10,
    paddingBottom: 6,
  },
  hourPill: {
    width: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
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
    backgroundColor: '#27272A',
  },
  pkgBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  pkgBadgeActive: {
    backgroundColor: '#EA580C',
  },
  pkgBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  hourNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  hourNumberActive: {
    color: '#EA580C',
  },
  hourKm: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  hourKmActive: {
    color: '#EA580C',
  },
  pillPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
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
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  packageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  packageCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  packageCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  packageTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 200,
  },
  priceMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EA580C',
  },
  priceStrike: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  uberDiscountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  uberDiscountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  perksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  extraNoticeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  extraNoticeBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  extraNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  pickupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickupCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  pickupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  pickupValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  vehicleImgBox: {
    width: 72,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
  },
  vehicleImg: {
    width: '100%',
    height: '100%',
  },
  vehicleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehicleDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
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
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  footerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  bookBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
