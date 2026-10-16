import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  MapPin,
  Crosshair,
  Check,
  ChevronRight,
  Building2,
  Navigation,
} from 'lucide-react-native';

export type CityName = 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad';

interface CityOption {
  name: CityName;
  state: string;
  majorHubs: string;
  airport: string;
}

const CITIES: CityOption[] = [
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    majorHubs: 'Indiranagar, Koramangala, Whitefield, Electronic City',
    airport: 'Kempegowda Int\'l Airport (BLR)',
  },
  {
    name: 'Delhi NCR',
    state: 'Delhi / NCR / Gurgaon',
    majorHubs: 'Connaught Place, Cyber Hub, Noida Sector 62',
    airport: 'Indira Gandhi Int\'l Airport (DEL)',
  },
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    majorHubs: 'BKC, Nariman Point, Andheri, Lower Parel',
    airport: 'Chhatrapati Shivaji Maharaj Int\'l (BOM)',
  },
  {
    name: 'Hyderabad',
    state: 'Telangana',
    majorHubs: 'Hitec City, Gachibowli, Jubilee Hills, Madhapur',
    airport: 'Rajiv Gandhi Int\'l Airport (HYD)',
  },
];

interface CityPickerModalProps {
  visible: boolean;
  onClose: () => void;
  activeCity: CityName;
  onSelectCity: (city: CityName) => void;
  onUseCurrentLocation: () => Promise<void> | void;
  theme?: 'light' | 'dark';
}

export const CityPickerModal: React.FC<CityPickerModalProps> = ({
  visible,
  onClose,
  activeCity,
  onSelectCity,
  onUseCurrentLocation,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [locatingGps, setLocatingGps] = useState(false);

  const handleGpsPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLocatingGps(true);
      await onUseCurrentLocation();
      onClose();
    } catch (err) {
      // Handled in context
    } finally {
      setLocatingGps(false);
    }
  };

  const handleCityPress = (city: CityName) => {
    Haptics.selectionAsync();
    onSelectCity(city);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <TouchableOpacity
          style={modalStyles.dismissTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[modalStyles.sheet, isDark && modalStyles.sheetDark]}>
          {/* Top Grabber Indicator */}
          <View style={modalStyles.grabber} />

          {/* Header */}
          <View style={modalStyles.header}>
            <View>
              <Text style={[modalStyles.title, isDark && modalStyles.textWhite]}>
                Select City or Zone
              </Text>
              <Text style={[modalStyles.subTitle, isDark && modalStyles.textMuted]}>
                Choose your operational area or use device GPS
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[modalStyles.closeBtn, isDark && modalStyles.closeBtnDark]}
              accessibilityLabel="Close City Picker"
              accessibilityRole="button"
            >
              <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* GPS Auto-detect Button */}
          <TouchableOpacity
            style={[modalStyles.gpsBtn, isDark && modalStyles.gpsBtnDark]}
            activeOpacity={0.85}
            onPress={handleGpsPress}
            disabled={locatingGps}
          >
            <View style={modalStyles.gpsIconCircle}>
              {locatingGps ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Crosshair size={18} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[modalStyles.gpsTitle, isDark && modalStyles.textWhite]}>
                Use Current GPS Location
              </Text>
              <Text style={[modalStyles.gpsSubtitle, isDark && modalStyles.textMuted]}>
                {locatingGps
                  ? 'Finding your exact coordinates...'
                  : 'Auto-detect nearest pickup point via GPS'}
              </Text>
            </View>
            <ChevronRight size={18} color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>

          {/* Section Divider */}
          <View style={modalStyles.sectionHeader}>
            <Building2 size={14} color="#F97316" />
            <Text style={[modalStyles.sectionTitle, isDark && modalStyles.textMuted]}>
              OPERATIONAL CITIES
            </Text>
          </View>

          {/* City Options */}
          <View style={modalStyles.citiesList}>
            {CITIES.map((city) => {
              const isSelected = activeCity === city.name;
              return (
                <TouchableOpacity
                  key={city.name}
                  style={[
                    modalStyles.cityCard,
                    isDark && modalStyles.cityCardDark,
                    isSelected && modalStyles.cityCardActive,
                    isSelected && isDark && modalStyles.cityCardActiveDark,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleCityPress(city.name)}
                >
                  <View style={[modalStyles.cityPin, isSelected && modalStyles.cityPinActive]}>
                    <MapPin size={16} color={isSelected ? '#F97316' : isDark ? '#94A3B8' : '#64748B'} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[modalStyles.cityName, isDark && modalStyles.textWhite, isSelected && modalStyles.cityNameActive]}>
                        {city.name}
                      </Text>
                      <Text style={[modalStyles.cityState, isDark && modalStyles.textMuted]}>
                        · {city.state}
                      </Text>
                    </View>
                    <Text style={[modalStyles.cityHubs, isDark && modalStyles.textMuted]} numberOfLines={1}>
                      {city.majorHubs}
                    </Text>
                    <Text style={modalStyles.cityAirport} numberOfLines={1}>
                      ✈ {city.airport}
                    </Text>
                  </View>

                  {isSelected ? (
                    <View style={modalStyles.selectedBadge}>
                      <Check size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <ChevronRight size={18} color={isDark ? '#475569' : '#CBD5E1'} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  dismissTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetDark: {
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
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMuted: {
    color: '#94A3B8',
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
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  gpsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  citiesList: {
    gap: 8,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cityCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  cityCardActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  cityCardActiveDark: {
    borderColor: '#F97316',
    backgroundColor: '#1E293B',
  },
  cityPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityPinActive: {
    backgroundColor: '#FFEDD5',
  },
  cityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cityNameActive: {
    color: '#F97316',
  },
  cityState: {
    fontSize: 12,
    color: '#64748B',
  },
  cityHubs: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cityAirport: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 2,
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
