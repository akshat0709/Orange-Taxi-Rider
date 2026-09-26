import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  Sparkles,
  MonitorPlay,
  Music2,
  Newspaper,
  Droplets,
  Snowflake,
  Zap,
  ShieldCheck,
  VolumeX,
  Leaf,
  Check,
  ArrowRight,
  Car,
  ChevronRight,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AmenitiesModalProps {
  visible: boolean;
  onClose: () => void;
  onBookNow?: () => void;
  theme?: 'light' | 'dark';
}

export function AmenitiesModal({
  visible,
  onClose,
  onBookNow,
  theme = 'light',
}: AmenitiesModalProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'amenities' | 'comparison'>('amenities');

  const signaturePerks = [
    {
      id: 'screen',
      icon: MonitorPlay,
      title: 'In-Seat LED Entertainment',
      tagline: 'Personal Rear Touchscreens',
      description:
        'Immersive in-seat HD displays in every Mahindra BE.6. Stream movies, podcasts, YouTube, flight status, and live route navigation on your journey.',
      badge: 'Signature Standard',
      accentColor: '#3B82F6',
      cardBg: 'rgba(59, 130, 246, 0.08)',
      borderColor: 'rgba(59, 130, 246, 0.25)',
    },
    {
      id: 'audio',
      icon: Music2,
      title: 'Premium Studio Acoustics',
      tagline: 'Best-in-Class Sound System',
      description:
        'Acoustically tuned multi-speaker surround audio. Pair your smartphone via 1-tap Bluetooth or enjoy our chauffeur’s curated tranquil commuting playlists.',
      badge: 'Audiophile Grade',
      accentColor: '#F97316',
      cardBg: 'rgba(249, 115, 22, 0.08)',
      borderColor: 'rgba(249, 115, 22, 0.25)',
    },
    {
      id: 'news',
      icon: Newspaper,
      title: 'Fresh Daily Newspapers',
      tagline: 'Morning Print Dailies in Every Cab',
      description:
        'Crisp morning editions of national, financial, and business dailies (Mint, The Economic Times, The Hindu) waiting in rear seat pockets every day.',
      badge: 'Fresh Daily',
      accentColor: '#10B981',
      cardBg: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
  ];

  const hospitalityPerks = [
    {
      icon: Droplets,
      title: 'Complimentary Bottled Water',
      detail: 'Clean sealed mineral water waiting in your armrest cup holder when you step in.',
      tag: 'Free on Board',
      color: '#38BDF8',
    },
    {
      icon: Snowflake,
      title: 'Pre-Cooled Cabin Comfort',
      detail: 'Chauffeur activates dual-zone air conditioning before arrival so you never step into a hot cab.',
      tag: 'Always 22°C',
      color: '#60A5FA',
    },
    {
      icon: Zap,
      title: '65W Fast Device Charging',
      detail: 'Universal USB-C and Lightning high-speed braided cords for smartphones, iPads, and laptops.',
      tag: 'Fast Charge',
      color: '#FBBF24',
    },
    {
      icon: VolumeX,
      title: 'Quiet Ride Mode',
      detail: 'Need to attend calls or rest? Tap Quiet Mode to let your chauffeur know to keep conversation minimal.',
      tag: 'Peaceful Commute',
      color: '#A78BFA',
    },
    {
      icon: ShieldCheck,
      title: 'Uniformed & Verified Chauffeurs',
      detail: 'Background-verified, professionally trained, courteous drivers with guaranteed zero cancellations.',
      tag: 'Zero Cancel Guarantee',
      color: '#34D399',
    },
    {
      icon: Leaf,
      title: '100% Mahindra BE.6 Luxury EV',
      detail: 'India’s finest electric SUV fleet in signature Electric Orange. Zero emissions and whisper-silent travel.',
      tag: 'Zero Emissions',
      color: '#4ADE80',
    },
  ];

  const comparisonRows = [
    {
      feature: 'Fleet Vehicle',
      everyday: 'Entry-level hatchback or sedan',
      orange: 'Mahindra BE.6 Luxury Electric SUV',
      luxury: 'High-end luxury sedan',
    },
    {
      feature: 'In-Seat LED Screens',
      everyday: '✕ Not available',
      orange: '✓ In-seat HD screens for all passengers',
      luxury: '✓ Available in select limos',
    },
    {
      feature: 'Studio Audio System',
      everyday: 'Standard factory radio',
      orange: '✓ Tuned acoustic sound system & Bluetooth',
      luxury: '✓ Premium audio',
    },
    {
      feature: 'Morning Newspapers',
      everyday: '✕ None',
      orange: '✓ Fresh daily Mint / ET / Hindu copies',
      luxury: '✕ Occasional magazine',
    },
    {
      feature: 'Chilled Bottled Water',
      everyday: '✕ Rarely provided',
      orange: '✓ Complimentary sealed bottle on board',
      luxury: '✓ Complimentary bottle',
    },
    {
      feature: 'Pre-Cooled Cabin',
      everyday: 'Hit-or-miss; AC arguments',
      orange: '✓ Pre-conditioned before car arrives',
      luxury: '✓ Pre-conditioned',
    },
    {
      feature: 'Driver Quality',
      everyday: 'High cancellation rates, casual wear',
      orange: '✓ Uniformed, courteous, 0% cancel rate',
      luxury: '✓ Suited chauffeur',
    },
    {
      feature: 'Pricing & Value',
      everyday: 'Unpredictable 2x-3x surge pricing',
      orange: '✓ Everyday honest transparent fares',
      luxury: '3x - 5x expensive luxury pricing',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
          {/* Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={{ flex: 1 }}>
              <View style={styles.eyebrowRow}>
                <Sparkles size={12} color="#F97316" />
                <Text style={styles.eyebrowText}>EXCLUSIVE MAHINDRA BE.6 FLEET</Text>
              </View>
              <Text style={[styles.title, isDark && styles.textWhite]}>The Orange In-Cab Experience</Text>
              <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>
                Everything inside our cars is designed for extraordinary everyday travel.
              </Text>
            </View>

            <TouchableOpacity style={[styles.closeBtn, isDark && styles.closeBtnDark]} onPress={onClose}>
              <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'amenities' && (isDark ? styles.tabBtnActiveDark : styles.tabBtnActive),
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('amenities');
              }}
            >
              <Sparkles size={14} color={activeTab === 'amenities' ? '#F97316' : '#9CA3AF'} />
              <Text
                style={[
                  styles.tabText,
                  isDark && styles.textMutedDark,
                  activeTab === 'amenities' && (isDark ? styles.tabTextActiveDark : styles.tabTextActive),
                ]}
                numberOfLines={1}
              >
                Onboard Perks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'comparison' && (isDark ? styles.tabBtnActiveDark : styles.tabBtnActive),
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('comparison');
              }}
            >
              <Car size={14} color={activeTab === 'comparison' ? '#F97316' : '#9CA3AF'} />
              <Text
                style={[
                  styles.tabText,
                  isDark && styles.textMutedDark,
                  activeTab === 'comparison' && (isDark ? styles.tabTextActiveDark : styles.tabTextActive),
                ]}
                numberOfLines={1}
              >
                Fleet Comparison
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {activeTab === 'amenities' ? (
              <>
                {/* 3 SIGNATURE CORNERSTONES */}
                <Text style={[styles.sectionHeading, isDark && styles.textMutedDark]}>
                  WHAT'S INSIDE EVERY ORANGE
                </Text>

                {signaturePerks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.signatureCard,
                        { backgroundColor: item.cardBg, borderColor: item.borderColor },
                      ]}
                    >
                      <View style={styles.signatureTopRow}>
                        <View style={[styles.signatureIconBox, { backgroundColor: item.cardBg }]}>
                          <Icon size={24} color={item.accentColor} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={styles.badgePill}>
                            <Text style={[styles.badgeText, { color: item.accentColor }]}>
                              {item.badge}
                            </Text>
                          </View>
                          <Text style={[styles.signatureTitle, isDark && styles.textWhite]}>{item.title}</Text>
                          <Text style={[styles.signatureTagline, isDark && styles.textMutedDark]}>{item.tagline}</Text>
                        </View>
                      </View>

                      <Text style={[styles.signatureDesc, isDark && styles.textMutedDark]}>{item.description}</Text>
                    </View>
                  );
                })}

                {/* HOSPITALITY & IN-CAB COMFORTS GRID */}
                <Text style={[styles.sectionHeading, isDark && styles.textMutedDark, { marginTop: 22 }]}>
                  HOSPITALITY & PASSENGER CARE
                </Text>

                <View style={styles.hospitalityGrid}>
                  {hospitalityPerks.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <View key={idx} style={[styles.hospitalityCard, isDark && styles.hospitalityCardDark]}>
                        <View style={styles.hospitalityHeaderRow}>
                          <View
                            style={[
                              styles.hospitalityIconCircle,
                              { backgroundColor: `${item.color}1A` },
                            ]}
                          >
                            <Icon size={18} color={item.color} />
                          </View>
                          <View style={styles.hospitalityTagPill}>
                            <Text style={[styles.hospitalityTagText, { color: item.color }]}>
                              {item.tag}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.hospitalityTitle, isDark && styles.textWhite]}>{item.title}</Text>
                        <Text style={[styles.hospitalityDetail, isDark && styles.textMutedDark]}>{item.detail}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* PROMISE BANNER */}
                <View style={styles.promiseBanner}>
                  <View style={styles.promiseDot} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.promiseTitle}>Zero Extra Charges for Luxury Perks</Text>
                    <Text style={[styles.promiseSub, isDark && styles.textMutedDark]}>
                      All amenities — screens, newspapers, water bottles, and pre-cooling — are
                      100% complimentary and included in your standard ride fare.
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              /* COMPARISON TAB */
              <>
                <Text style={[styles.sectionHeading, isDark && styles.textMutedDark]}>THE VALUE PROPOSITION</Text>
                <Text style={[styles.comparisonIntro, isDark && styles.textMutedDark]}>
                  Orange brings the care, comfort, and hospitality of luxury chauffeur travel into
                  the everyday rhythm of urban commuting — without the inflated price tag.
                </Text>

                <View style={styles.comparisonTable}>
                  {comparisonRows.map((row, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.comparisonCard,
                        isDark
                          ? styles.comparisonCardDark
                          : (idx % 2 === 0 ? styles.comparisonCardEven : styles.comparisonCardOdd),
                      ]}
                    >
                      <Text style={[styles.comparisonFeatureTitle, isDark && styles.textWhite]}>{row.feature}</Text>

                      {/* Orange Taxi Featured Row */}
                      <View style={styles.comparisonOrangeBox}>
                        <View style={styles.comparisonOrangeTag}>
                          <Text style={styles.comparisonOrangeTagText}>ORANGE TAXI</Text>
                        </View>
                        <Text style={[styles.comparisonOrangeText, isDark && styles.textWhite]}>{row.orange}</Text>
                      </View>

                      {/* Everyday Cab Row */}
                      <View style={styles.comparisonOtherRow}>
                        <Text style={styles.comparisonOtherLabel}>Everyday App Cabs:</Text>
                        <Text style={[styles.comparisonOtherText, isDark && styles.textMutedDark]}>{row.everyday}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={[styles.footer, isDark && styles.footerDark]}>
            <TouchableOpacity
              style={styles.bookCtaBtn}
              activeOpacity={0.88}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
                onBookNow?.();
              }}
            >
              <Text style={styles.bookCtaText}>Experience Orange Taxi</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
  },
  modalCardDark: {
    backgroundColor: '#0E1117',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#F97316',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginLeft: 10,
  },
  closeBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBarDark: {
    backgroundColor: '#14171F',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  tabBtnActiveDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  tabTextActiveDark: {
    color: '#F97316',
    fontWeight: '800',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: '#64748B',
    marginBottom: 12,
  },
  signatureCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  signatureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  signatureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  signatureTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 1,
  },
  signatureDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 18,
  },
  hospitalityGrid: {
    gap: 10,
  },
  hospitalityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  hospitalityCardDark: {
    backgroundColor: '#14171F',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  hospitalityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hospitalityIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalityTagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hospitalityTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hospitalityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  hospitalityDetail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  promiseBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    marginBottom: 10,
  },
  promiseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    marginTop: 5,
  },
  promiseTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F97316',
  },
  promiseSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  comparisonIntro: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  comparisonTable: {
    gap: 10,
  },
  comparisonCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  comparisonCardDark: {
    backgroundColor: '#14171F',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  comparisonCardEven: {
    backgroundColor: '#FFFFFF',
  },
  comparisonCardOdd: {
    backgroundColor: '#F8FAFC',
  },
  comparisonFeatureTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  comparisonOrangeBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  comparisonOrangeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F97316',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  comparisonOrangeTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  comparisonOrangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  comparisonOtherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  comparisonOtherLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  comparisonOtherText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerDark: {
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  bookCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 14,
  },
  bookCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
