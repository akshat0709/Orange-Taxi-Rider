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
  Briefcase,
  Camera,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Droplets,
  Award,
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
    orangePrice: 648,
    tagline: 'Doctor visits, shopping & quick city tasks',
  },
  {
    id: '3h',
    hours: 3,
    distanceKm: 30,
    uberPrice: 1080,
    orangePrice: 972,
    tagline: 'Multiple errands across town with stops',
  },
  {
    id: '4h',
    hours: 4,
    distanceKm: 40,
    uberPrice: 1440,
    orangePrice: 1296,
    badge: 'MOST POPULAR',
    tagline: 'Half-day business meetings & client visits',
  },
  {
    id: '5h',
    hours: 5,
    distanceKm: 50,
    uberPrice: 1800,
    orangePrice: 1620,
    tagline: 'Extended half-day with flexible stops',
  },
  {
    id: '6h',
    hours: 6,
    distanceKm: 60,
    uberPrice: 2160,
    orangePrice: 1944,
    tagline: 'Multi-location corporate visits & shopping',
  },
  {
    id: '8h',
    hours: 8,
    distanceKm: 80,
    uberPrice: 2880,
    orangePrice: 2592,
    badge: 'BEST VALUE',
    tagline: 'Full-day city disposal (8 hours / 80 km)',
  },
  {
    id: '10h',
    hours: 10,
    distanceKm: 100,
    uberPrice: 3600,
    orangePrice: 3240,
    tagline: 'Full-day comprehensive travel & events',
  },
  {
    id: '12h',
    hours: 12,
    distanceKm: 120,
    uberPrice: 4320,
    orangePrice: 3888,
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
  const [step, setStep] = useState<'benefits' | 'fares'>('benefits');
  const [selectedIdx, setSelectedIdx] = useState(3); // Default 4h (Most Popular)
  const currentPkg = HOURLY_PACKAGES[selectedIdx] || HOURLY_PACKAGES[0];

  const handleClose = () => {
    setStep('benefits');
    onClose();
  };

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
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Grabber */}
          <View style={styles.grabber} />

          {/* ============================================================ */}
          {/* STEP 1: BENEFITS PAGE (CLEAN, UNCLUTTERED, ONLY BOOK BUTTON) */}
          {/* ============================================================ */}
          {step === 'benefits' && (
            <>
              {/* Header */}
              <View style={[styles.header, isDark && styles.headerDark]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.orangeBadgeDot} />
                    <Text style={[styles.title, isDark && styles.textWhite]}>Hourly Chauffeur</Text>
                  </View>
                  <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>
                    Mahindra BE.6 EV cab at your continuous disposal
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.closeBtn, isDark && styles.closeBtnDark]}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* 10% Uber Discount Hero Pill */}
                <View style={[styles.heroPromoBanner, isDark && styles.heroPromoBannerDark]}>
                  <View style={styles.zapIconWrap}>
                    <Zap size={16} color="#15803D" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroPromoTitle}>10% Cheaper than Uber Rentals</Text>
                    <Text style={[styles.heroPromoSub, isDark && styles.textMutedDark]}>
                      Uber ₹400/hr, ₹720/2hr · Orange Taxi ₹360/hr, ₹648/2hr
                    </Text>
                  </View>
                </View>

                {/* Key Benefits Grid / Cards */}
                <Text style={[styles.sectionHeading, isDark && styles.textMutedDark]}>
                  EXCLUSIVE HOURLY PRIVILEGES
                </Text>

                <View style={styles.benefitsList}>
                  {/* Benefit 1 */}
                  <View style={[styles.benefitCard, isDark && styles.benefitCardDark]}>
                    <View style={[styles.benefitIconWrap, { backgroundColor: '#FFEDD5' }]}>
                      <RotateCcw size={18} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.benefitTitle, isDark && styles.textWhite]}>
                        Unlimited Stops & Patient Waiting
                      </Text>
                      <Text style={[styles.benefitDesc, isDark && styles.textMutedDark]}>
                        Attend back-to-back meetings, doctor visits, or retail shopping. Your chauffeur waits for you at every stop.
                      </Text>
                    </View>
                  </View>

                  {/* Benefit 2 */}
                  <View style={[styles.benefitCard, isDark && styles.benefitCardDark]}>
                    <View style={[styles.benefitIconWrap, { backgroundColor: '#DCFCE7' }]}>
                      <Navigation size={18} color="#15803D" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.benefitTitle, isDark && styles.textWhite]}>
                        No Drop-Off Destination Needed
                      </Text>
                      <Text style={[styles.benefitDesc, isDark && styles.textMutedDark]}>
                        Only select your pickup spot. Go anywhere across the city at your pace without updating routes.
                      </Text>
                    </View>
                  </View>

                  {/* Benefit 3 */}
                  <View style={[styles.benefitCard, isDark && styles.benefitCardDark]}>
                    <View style={[styles.benefitIconWrap, { backgroundColor: '#DBEAFE' }]}>
                      <Sparkles size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.benefitTitle, isDark && styles.textWhite]}>
                        100% Mahindra BE.6 Luxury EV
                      </Text>
                      <Text style={[styles.benefitDesc, isDark && styles.textMutedDark]}>
                        Pre-cooled 22°C dual-zone climate, silent electric cabin, chilled water bottles, and in-seat fast charging.
                      </Text>
                    </View>
                  </View>

                  {/* Benefit 4 */}
                  <View style={[styles.benefitCard, isDark && styles.benefitCardDark]}>
                    <View style={[styles.benefitIconWrap, { backgroundColor: '#F3E8FF' }]}>
                      <ShieldCheck size={18} color="#7E22CE" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.benefitTitle, isDark && styles.textWhite]}>
                        Zero Cancellations & Zero Surge
                      </Text>
                      <Text style={[styles.benefitDesc, isDark && styles.textMutedDark]}>
                        Dedicated verified chauffeur assigned immediately with guaranteed on-time pickup.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Popular Uses Tags */}
                <View style={styles.useCaseRow}>
                  <View style={[styles.useCasePill, isDark && styles.useCasePillDark]}>
                    <Briefcase size={12} color="#F97316" />
                    <Text style={[styles.useCaseText, isDark && styles.textWhite]}>Business Meetings</Text>
                  </View>
                  <View style={[styles.useCasePill, isDark && styles.useCasePillDark]}>
                    <ShoppingBag size={12} color="#3B82F6" />
                    <Text style={[styles.useCaseText, isDark && styles.textWhite]}>City Shopping</Text>
                  </View>
                  <View style={[styles.useCasePill, isDark && styles.useCasePillDark]}>
                    <Camera size={12} color="#10B981" />
                    <Text style={[styles.useCaseText, isDark && styles.textWhite]}>City Sightseeing</Text>
                  </View>
                </View>

                <View style={{ height: 16 }} />
              </ScrollView>

              {/* Step 1 ONLY Action Button */}
              <View style={[styles.singleActionFooter, isDark && styles.footerDark]}>
                <TouchableOpacity
                  style={styles.primaryFullBtn}
                  activeOpacity={0.88}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setStep('fares');
                  }}
                >
                  <Text style={styles.primaryFullBtnText}>Book Hourly Chauffeur</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ============================================================ */}
          {/* STEP 2: FARES & DURATION SELECTION PAGE                       */}
          {/* ============================================================ */}
          {step === 'fares' && (
            <>
              {/* Header with Back Button */}
              <View style={[styles.header, isDark && styles.headerDark]}>
                <TouchableOpacity
                  style={[styles.backBtn, isDark && styles.closeBtnDark]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setStep('benefits');
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowLeft size={18} color={isDark ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.title, isDark && styles.textWhite]}>Select Rental Duration</Text>
                  <Text style={[styles.subTitle, isDark && styles.textMutedDark]}>
                    All packages include 10% discount vs Uber
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.closeBtn, isDark && styles.closeBtnDark]}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* 10% Discount notice banner */}
                <View style={[styles.discountTagBanner, isDark && styles.discountTagBannerDark]}>
                  <Zap size={14} color="#15803D" />
                  <Text style={styles.discountTagText}>
                    10% Less than Uber: ₹400 → ₹360 (1h) · ₹720 → ₹648 (2h)
                  </Text>
                </View>

                {/* Horizontal Hours Carousel */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, isDark && styles.textMutedDark]}>
                    CHOOSE DURATION
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
                        <Text
                          style={[
                            styles.hourKm,
                            isDark && styles.textMutedDark,
                            isSelected && styles.hourKmActive,
                          ]}
                        >
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

                {/* Selected Package Spotlight Card */}
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

                  {/* 10% Off Savings Pill */}
                  <View style={styles.uberDiscountPill}>
                    <Zap size={13} color="#15803D" />
                    <Text style={styles.uberDiscountText}>
                      10% Less than Uber · You Save ₹{savings}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* Package Perks */}
                  <View style={styles.perksRow}>
                    <View style={styles.perkItem}>
                      <Clock size={15} color="#F97316" />
                      <Text style={[styles.perkLabel, isDark && styles.textWhite]}>
                        {currentPkg.hours}h Waiting
                      </Text>
                    </View>
                    <View style={styles.perkItem}>
                      <Navigation size={15} color="#3B82F6" />
                      <Text style={[styles.perkLabel, isDark && styles.textWhite]}>
                        {currentPkg.distanceKm} km Included
                      </Text>
                    </View>
                    <View style={styles.perkItem}>
                      <RotateCcw size={15} color="#10B981" />
                      <Text style={[styles.perkLabel, isDark && styles.textWhite]}>
                        Unlimited Stops
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.extraNoticeText, isDark && styles.textMutedDark]}>
                    Extra: ₹14/km · ₹2.5/min beyond package · Tolls & parking at actuals
                  </Text>
                </View>

                {/* Pickup Location Card */}
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
                      CHAUFFEUR PICKUP LOCATION
                    </Text>
                    <Text style={[styles.pickupValue, isDark && styles.textWhite]} numberOfLines={1}>
                      {pickupText || 'Indiranagar, Bengaluru'}
                    </Text>
                  </View>
                  {onChangePickup && <Text style={styles.changePickupBtn}>Change</Text>}
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
                    {currentPkg.hours}h · {currentPkg.distanceKm}km package
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
            </>
          )}
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
    maxHeight: '90%',
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
  orangeBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
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
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
  heroPromoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  heroPromoBannerDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.4)',
    borderColor: '#065F46',
  },
  zapIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPromoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  heroPromoSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  benefitsList: {
    gap: 10,
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  benefitCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  benefitDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  useCaseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  useCasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  useCasePillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  useCaseText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  singleActionFooter: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryFullBtn: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryFullBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  discountTagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  discountTagBannerDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.5)',
  },
  discountTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
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
    width: 124,
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
