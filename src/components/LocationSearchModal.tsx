import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  X,
  MapPin,
  Crosshair,
  Plane,
  Building2,
  Train,
  ShoppingBag,
  Map,
} from 'lucide-react-native';
import { LocationItem, searchPlaces, EXPANDED_PRESETS } from '../lib/locationService';

interface LocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  pickupText: string;
  pickupCoords: { lat: number; lng: number };
  dropLocation: LocationItem;
  onSelectPickup: (loc: { name: string; lat: number; lng: number; city: string }) => void;
  onSelectDrop: (loc: LocationItem) => void;
  onChooseOnMap: (target: 'pickup' | 'drop') => void;
  onUseCurrentGPS: () => void;
  activeCity: 'All' | 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad';
  onChangeCity: (city: 'All' | 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad') => void;
}

const { width } = Dimensions.get('window');

export function LocationSearchModal({
  visible,
  onClose,
  pickupText,
  pickupCoords,
  dropLocation,
  onSelectPickup,
  onSelectDrop,
  onChooseOnMap,
  onUseCurrentGPS,
  activeCity,
  onChangeCity,
}: LocationSearchModalProps) {
  const [activeField, setActiveField] = useState<'pickup' | 'drop'>('drop');
  const [pickupInput, setPickupInput] = useState(pickupText);
  const [dropInput, setDropInput] = useState('');
  const [results, setResults] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const searchTimeoutRef = useRef<any>(null);
  const dropInputRef = useRef<TextInput>(null);
  const pickupInputRef = useRef<TextInput>(null);

  // Sync inputs and load initial recommendations when modal opens
  useEffect(() => {
    if (visible) {
      setPickupInput(pickupText);
      setDropInput('');
      setActiveField('drop');
      executeSearch('', activeCity);

      // Smooth autofocus after modal transition
      const timer = setTimeout(() => {
        dropInputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // If active city changes while modal is open, reload recommendations
  useEffect(() => {
    if (visible) {
      const currentQuery = activeField === 'pickup' ? pickupInput : dropInput;
      executeSearch(currentQuery, activeCity);
    }
  }, [activeCity]);

  async function executeSearch(queryText: string, city: typeof activeCity) {
    setLoading(true);
    try {
      const found = await searchPlaces(queryText, city, pickupCoords);
      setResults(found);
    } catch (e) {
      setResults(EXPANDED_PRESETS.slice(0, 10));
    } finally {
      setLoading(false);
    }
  }

  // Handle live debounced search as user types
  function handleTextChange(text: string, field: 'pickup' | 'drop') {
    if (field === 'pickup') {
      setPickupInput(text);
    } else {
      setDropInput(text);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = text.trim();
    if (!query) {
      executeSearch('', activeCity);
      return;
    }

    // Schedule background search after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query, activeCity);
    }, 280);
  }

  function handleSelectLocation(item: LocationItem) {
    Haptics.selectionAsync();
    if (activeField === 'pickup') {
      setPickupInput(item.name);
      onSelectPickup({
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        city: item.city,
      });
      // Switch focus to destination
      setActiveField('drop');
      dropInputRef.current?.focus();
      executeSearch(dropInput, activeCity);
    } else {
      setDropInput(item.name);
      onSelectDrop(item);
      onClose();
    }
  }

  function getIcon(item: LocationItem) {
    if (item.isAirport) return <Plane size={18} color="#F56B00" />;
    if (item.isTechPark) return <Building2 size={18} color="#3B82F6" />;
    if (item.isMetro) return <Train size={18} color="#10B981" />;
    if (item.tag?.includes('Mall') || item.tag?.includes('Market')) return <ShoppingBag size={18} color="#EC4899" />;
    return <MapPin size={18} color="#9CA3AF" />;
  }

  const currentQuery = activeField === 'pickup' ? pickupInput : dropInput;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Where are you going?</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Dual Connected Inputs (Uber / Ola Style) */}
        <View style={styles.inputsCard}>
          {/* Visual Route Connector */}
          <View style={styles.routePillGuide}>
            <View style={styles.pickupDot} />
            <View style={styles.connectorLine} />
            <View style={styles.dropSquare} />
          </View>

          <View style={styles.inputFieldsColumn}>
            {/* Pickup Input Field */}
            <View
              style={[
                styles.inputRow,
                activeField === 'pickup' && styles.inputRowActive,
              ]}
            >
              <TextInput
                ref={pickupInputRef}
                style={styles.textInput}
                placeholder="Enter pickup point..."
                placeholderTextColor="#6B7280"
                value={pickupInput}
                autoCorrect={false}
                autoCapitalize="words"
                onFocus={() => setActiveField('pickup')}
                onChangeText={(text) => handleTextChange(text, 'pickup')}
              />
              {pickupInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setPickupInput('');
                    executeSearch('', activeCity);
                  }}
                  style={styles.clearBtn}
                >
                  <X size={14} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputDivider} />

            {/* Destination Input Field */}
            <View
              style={[
                styles.inputRow,
                activeField === 'drop' && styles.inputRowActive,
              ]}
            >
              <TextInput
                ref={dropInputRef}
                style={styles.textInput}
                placeholder="Search destination, airport, hub..."
                placeholderTextColor="#6B7280"
                value={dropInput}
                autoCorrect={false}
                autoCapitalize="words"
                onFocus={() => setActiveField('drop')}
                onChangeText={(text) => handleTextChange(text, 'drop')}
              />
              {dropInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setDropInput('');
                    executeSearch('', activeCity);
                  }}
                  style={styles.clearBtn}
                >
                  <X size={14} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Action Shortcuts (Use Current GPS / Choose on Map) */}
        <View style={styles.actionShortcutsRow}>
          <TouchableOpacity
            style={styles.actionShortcutBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onUseCurrentGPS();
              setPickupInput(pickupText);
              setActiveField('drop');
              dropInputRef.current?.focus();
            }}
          >
            <Crosshair size={14} color="#22C55E" />
            <Text style={styles.actionShortcutText}>Current GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionShortcutBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onChooseOnMap(activeField);
            }}
          >
            <Map size={14} color="#F56B00" />
            <Text style={styles.actionShortcutText}>Set on Map</Text>
          </TouchableOpacity>
        </View>

        {/* City Filter Pills */}
        <View style={styles.cityPillsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['All', 'Delhi NCR', 'Bengaluru', 'Mumbai', 'Hyderabad'] as const}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.cityPill, activeCity === item && styles.cityPillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChangeCity(item);
                }}
              >
                <Text style={[styles.cityPillText, activeCity === item && styles.cityPillTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          />
        </View>

        {/* Results / Suggestions Section Header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsHeaderTitle}>
            {loading
              ? 'SEARCHING LIVE LOCATIONS...'
              : currentQuery.trim().length > 0
              ? `RESULTS FOR "${currentQuery}"`
              : `POPULAR IN ${activeCity.toUpperCase()}`}
          </Text>
          {loading && <ActivityIndicator size="small" color="#F56B00" />}
        </View>

        {/* Search Results List */}
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectLocation(item)}
            >
              <View style={styles.resultIconBox}>{getIcon(item)}</View>
              <View style={styles.resultDetails}>
                <View style={styles.resultTitleRow}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.city && (
                    <View style={styles.cityBadge}>
                      <Text style={styles.cityBadgeText}>{item.city}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.resultSubtitle} numberOfLines={2}>
                  {item.subtitle || `${item.city}, India`}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <MapPin size={36} color="#4B5563" />
                <Text style={styles.emptyTitle}>No locations matched</Text>
                <Text style={styles.emptySub}>
                  Try searching for an area, street, landmark or airport.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A202C',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E232F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inputsCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#151922',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232936',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routePillGuide: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  connectorLine: {
    width: 2,
    height: 36,
    backgroundColor: '#374151',
    marginVertical: 4,
  },
  dropSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#F56B00',
  },
  inputFieldsColumn: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  inputRowActive: {
    backgroundColor: 'rgba(245, 107, 0, 0.08)',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 4,
  },
  clearBtn: {
    padding: 6,
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#232936',
    marginVertical: 4,
  },
  actionShortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  actionShortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E232F',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  actionShortcutText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  cityPillsContainer: {
    marginTop: 14,
    marginBottom: 6,
  },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1A202C',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  cityPillActive: {
    backgroundColor: '#F56B00',
    borderColor: '#F56B00',
  },
  cityPillText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  cityPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  resultsHeaderTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#161B26',
  },
  resultIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  resultDetails: {
    flex: 1,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  resultName: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
  cityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  cityBadgeText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  resultSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
