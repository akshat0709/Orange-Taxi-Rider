import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Snowflake,
  Music2,
  VolumeX,
  Briefcase,
  BellOff,
  MonitorPlay,
  Droplets,
  Sparkles,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export interface CabinPreferences {
  temperature: '19°C' | '21°C' | '23°C';
  music: 'lofi' | 'bollywood' | 'jazz' | 'quiet';
  luggageHelp: boolean;
  noHonking: boolean;
  screenOn: boolean;
  waterBottle: boolean;
}

interface CabinConciergeModalProps {
  visible: boolean;
  onClose: () => void;
  preferences: CabinPreferences;
  onUpdatePreferences: (updated: Partial<CabinPreferences>) => void;
  theme?: 'light' | 'dark';
}

const { width } = Dimensions.get('window');

export function CabinConciergeModal({
  visible,
  onClose,
  preferences,
  onUpdatePreferences,
  theme = 'dark',
}: CabinConciergeModalProps) {
  const isDark = theme === 'dark';

  const handleTempSelect = (temp: '19°C' | '21°C' | '23°C') => {
    Haptics.selectionAsync();
    onUpdatePreferences({ temperature: temp });
  };

  const handleMusicSelect = (music: 'lofi' | 'bollywood' | 'jazz' | 'quiet') => {
    Haptics.selectionAsync();
    onUpdatePreferences({ music });
  };

  const toggleOption = (key: keyof CabinPreferences) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdatePreferences({ [key]: !preferences[key] });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.badgeWrap}>
                <Sparkles size={14} color="#F97316" />
                <Text style={styles.badgeText}>Mahindra BE.6 Exclusive</Text>
              </View>
              <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
                Cabin Concierge
              </Text>
              <Text style={styles.subtitle}>
                Customize climate, acoustics & hospitality for your ride
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 1. Pre-Cooled AC Temperature */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Snowflake size={16} color="#38BDF8" />
                <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                  Pre-Cooled AC Climate
                </Text>
                <Text style={styles.currentValBadge}>{preferences.temperature}</Text>
              </View>

              <View style={styles.chipsRow}>
                {[
                  { id: '19°C', label: '19°C · Chilled', desc: 'Max cooling' },
                  { id: '21°C', label: '21°C · Optimal', desc: 'Standard luxury' },
                  { id: '23°C', label: '23°C · Mild', desc: 'Gentle breeze' },
                ].map((item) => {
                  const isSelected = preferences.temperature === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.chipBtn,
                        isDark ? styles.chipBtnDark : styles.chipBtnLight,
                        isSelected && styles.chipBtnSelected,
                      ]}
                      onPress={() => handleTempSelect(item.id as any)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          isDark ? styles.chipLabelDark : styles.chipLabelLight,
                          isSelected && styles.chipLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.chipDesc,
                          isSelected && styles.chipDescSelected,
                        ]}
                      >
                        {item.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Audio Ambience & Music Mood */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Music2 size={16} color="#F97316" />
                <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                  Acoustic Ambience
                </Text>
              </View>

              <View style={styles.gridRow}>
                {[
                  { id: 'lofi', label: 'Lo-Fi Lounge', icon: Music2, desc: 'Chill beats' },
                  { id: 'bollywood', label: 'Bollywood Gold', icon: Music2, desc: 'Classic acoustics' },
                  { id: 'jazz', label: 'Smooth Jazz', icon: Music2, desc: 'Relaxing saxophone' },
                  { id: 'quiet', label: 'Quiet Cabin', icon: VolumeX, desc: 'Zero music / Quiet' },
                ].map((item) => {
                  const isSelected = preferences.music === item.id;
                  const IconComponent = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.musicCard,
                        isDark ? styles.musicCardDark : styles.musicCardLight,
                        isSelected && styles.musicCardSelected,
                      ]}
                      onPress={() => handleMusicSelect(item.id as any)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.musicIconWrap, isSelected && styles.musicIconWrapSelected]}>
                        <IconComponent size={18} color={isSelected ? '#F97316' : (isDark ? '#94A3B8' : '#64748B')} />
                      </View>
                      <Text
                        style={[
                          styles.musicLabel,
                          isDark ? styles.textDark : styles.textLight,
                          isSelected && styles.musicLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.musicDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. In-Cabin Hospitality Toggles */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <ShieldCheck size={16} color="#10B981" />
                <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                  Chauffeur Hospitality
                </Text>
              </View>

              <View style={styles.toggleList}>
                {/* No Honking */}
                <TouchableOpacity
                  style={[styles.toggleRow, isDark ? styles.toggleRowDark : styles.toggleRowLight]}
                  onPress={() => toggleOption('noHonking')}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleIconWrap}>
                    <BellOff size={18} color="#F97316" />
                  </View>
                  <View style={styles.toggleTextWrap}>
                    <Text style={[styles.toggleLabel, isDark ? styles.textDark : styles.textLight]}>
                      Do Not Honk / Quiet Journey
                    </Text>
                    <Text style={styles.toggleSub}>Instructs chauffeur to avoid unnecessary honking</Text>
                  </View>
                  <View style={[styles.checkbox, preferences.noHonking && styles.checkboxActive]}>
                    {preferences.noHonking && <Check size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>

                {/* Luggage Assistance */}
                <TouchableOpacity
                  style={[styles.toggleRow, isDark ? styles.toggleRowDark : styles.toggleRowLight]}
                  onPress={() => toggleOption('luggageHelp')}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleIconWrap}>
                    <Briefcase size={18} color="#38BDF8" />
                  </View>
                  <View style={styles.toggleTextWrap}>
                    <Text style={[styles.toggleLabel, isDark ? styles.textDark : styles.textLight]}>
                      Luggage Assistance
                    </Text>
                    <Text style={styles.toggleSub}>Chauffeur opens boot and handles heavy bags</Text>
                  </View>
                  <View style={[styles.checkbox, preferences.luggageHelp && styles.checkboxActive]}>
                    {preferences.luggageHelp && <Check size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>

                {/* In-Seat HD LED Screen */}
                <TouchableOpacity
                  style={[styles.toggleRow, isDark ? styles.toggleRowDark : styles.toggleRowLight]}
                  onPress={() => toggleOption('screenOn')}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleIconWrap}>
                    <MonitorPlay size={18} color="#A855F7" />
                  </View>
                  <View style={styles.toggleTextWrap}>
                    <Text style={[styles.toggleLabel, isDark ? styles.textDark : styles.textLight]}>
                      In-Seat HD Entertainment Screen
                    </Text>
                    <Text style={styles.toggleSub}>Screen powered on with entertainment media</Text>
                  </View>
                  <View style={[styles.checkbox, preferences.screenOn && styles.checkboxActive]}>
                    {preferences.screenOn && <Check size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>

                {/* Chilled Water Bottle */}
                <TouchableOpacity
                  style={[styles.toggleRow, isDark ? styles.toggleRowDark : styles.toggleRowLight]}
                  onPress={() => toggleOption('waterBottle')}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleIconWrap}>
                    <Droplets size={18} color="#06B6D4" />
                  </View>
                  <View style={styles.toggleTextWrap}>
                    <Text style={[styles.toggleLabel, isDark ? styles.textDark : styles.textLight]}>
                      Complimentary Bottled Water
                    </Text>
                    <Text style={styles.toggleSub}>Sealed water bottle ready at your seat</Text>
                  </View>
                  <View style={[styles.checkbox, preferences.waterBottle && styles.checkboxActive]}>
                    {preferences.waterBottle && <Check size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save Cabin Preferences</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  containerDark: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  titleWrap: {
    flex: 1,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F97316',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  textDark: {
    color: '#F8FAFC',
  },
  textLight: {
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentValBadge: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  chipBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  chipBtnLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  chipBtnSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipLabelDark: {
    color: '#E2E8F0',
  },
  chipLabelLight: {
    color: '#1E293B',
  },
  chipLabelSelected: {
    color: '#38BDF8',
  },
  chipDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  chipDescSelected: {
    color: '#38BDF8',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  musicCard: {
    width: (width - 48) / 2,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  musicCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  musicCardLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  musicCardSelected: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  musicIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  musicIconWrapSelected: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  musicLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  musicLabelSelected: {
    color: '#F97316',
  },
  musicDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  toggleList: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleRowDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  toggleRowLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  toggleIconWrap: {
    marginRight: 10,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  saveBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
