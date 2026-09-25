import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { MapPin, Navigation, Car, Crosshair, Map } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
interface RideMapProps {
  pickup: { lat: number; lng: number; name?: string };
  drop?: { lat: number; lng: number; name?: string };
  driverLocation?: { lat: number; lng: number } | null;
  status?: string;
  height?: number | string;
  interactive?: boolean;
  isPinPickerMode?: boolean;
  pinPickerTarget?: 'pickup' | 'drop';
  onPinLocationChange?: (coords: { lat: number; lng: number }) => void;
  onMapPress?: (coords: { lat: number; lng: number }) => void;
  onRecenterPress?: () => void;
  routeDistanceKm?: number;
  routeDurationMin?: number;
}

const { width } = Dimensions.get('window');

// Minimalist, modern light grayscale cartography for clean Uber-style look (Option B)
const MINIMAL_LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#F4F5F7' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 2 }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1F2937' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E5E7EB' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E5E7EB' }, { weight: 1 }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#D1D5DB' }, { weight: 1.5 }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#E0E7FF' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
];

export function RideMap({
  pickup,
  drop,
  driverLocation,
  status = 'searching',
  height = 220,
  interactive = true,
  isPinPickerMode = false,
  pinPickerTarget = 'drop',
  onPinLocationChange,
  onMapPress,
  onRecenterPress,
  routeDistanceKm,
  routeDurationMin,
}: RideMapProps) {
  const mapRef = useRef<MapView>(null);
  const isInProgress = status === 'in_progress';
  const hasValidDrop = drop && drop.lat && drop.lng && (drop.lat !== pickup.lat || drop.lng !== pickup.lng);

  useEffect(() => {
    if (isPinPickerMode) return;

    if (mapRef.current && pickup.lat) {
      if (hasValidDrop && drop) {
        let coords = [];
        if (isInProgress) {
          const currentCar = driverLocation?.lat && driverLocation?.lng
            ? { latitude: driverLocation.lat, longitude: driverLocation.lng }
            : { latitude: pickup.lat, longitude: pickup.lng };
          coords = [currentCar, { latitude: drop.lat, longitude: drop.lng }];
        } else if (status === 'accepted' || status === 'arrived') {
          if (driverLocation?.lat && driverLocation?.lng) {
            coords = [
              { latitude: driverLocation.lat, longitude: driverLocation.lng },
              { latitude: pickup.lat, longitude: pickup.lng },
            ];
          } else {
            coords = [{ latitude: pickup.lat, longitude: pickup.lng }, { latitude: drop.lat, longitude: drop.lng }];
          }
        } else {
          coords = [{ latitude: pickup.lat, longitude: pickup.lng }, { latitude: drop.lat, longitude: drop.lng }];
        }

        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 70, right: 60, bottom: 70, left: 60 },
          animated: true,
        });
      } else {
        // Idle / Explore mode: tightly zoom in to street-level on user GPS
        mapRef.current.animateToRegion(
          {
            latitude: pickup.lat,
            longitude: pickup.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500
        );
      }
    }
  }, [pickup.lat, pickup.lng, drop?.lat, drop?.lng, driverLocation?.lat, driverLocation?.lng, status, isPinPickerMode]);

  const currentCarCoord = driverLocation?.lat && driverLocation?.lng
    ? { latitude: driverLocation.lat, longitude: driverLocation.lng }
    : { latitude: pickup.lat, longitude: pickup.lng };

  const polylineCoords = hasValidDrop && drop
    ? isInProgress
      ? [currentCarCoord, { latitude: drop.lat, longitude: drop.lng }]
      : status === 'accepted' && driverLocation?.lat
      ? [{ latitude: driverLocation.lat, longitude: driverLocation.lng }, { latitude: pickup.lat, longitude: pickup.lng }]
      : [
          { latitude: pickup.lat, longitude: pickup.lng },
          ...(driverLocation?.lat ? [{ latitude: driverLocation.lat, longitude: driverLocation.lng }] : []),
          { latitude: drop.lat, longitude: drop.lng },
        ]
    : [];

  function handleRegionChangeComplete(region: Region) {
    if (isPinPickerMode && onPinLocationChange) {
      onPinLocationChange({ lat: region.latitude, lng: region.longitude });
    }
  }

  return (
    <View style={[styles.container, typeof height === 'number' ? { height } : { flex: 1 }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        customMapStyle={MINIMAL_LIGHT_MAP_STYLE}
        userInterfaceStyle="light"
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={interactive}
        rotateEnabled={interactive}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={(e) => {
          if (onMapPress && e.nativeEvent.coordinate) {
            onMapPress({
              lat: e.nativeEvent.coordinate.latitude,
              lng: e.nativeEvent.coordinate.longitude,
            });
          }
        }}
        initialRegion={{
          latitude: pickup.lat || 12.9719,
          longitude: pickup.lng || 77.5937,
          latitudeDelta: hasValidDrop ? 0.08 : 0.005,
          longitudeDelta: hasValidDrop ? 0.08 : 0.005,
        }}
      >
        {/* Pickup Pin - Signature Glowing Orange Halo */}
        {(!isPinPickerMode || pinPickerTarget !== 'pickup') && pickup.lat && (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            title="Pickup Location"
            description={pickup.name || 'Pickup Point'}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.pickupPulseContainer}>
              <View style={styles.pickupPulseOuter} />
              <View style={styles.pickupPulseInner} />
            </View>
          </Marker>
        )}

        {/* Destination Pin */}
        {(!isPinPickerMode || pinPickerTarget !== 'drop') && hasValidDrop && drop && (
          <Marker
            coordinate={{ latitude: drop.lat, longitude: drop.lng }}
            title="Drop Destination"
            description={drop.name || 'Drop Point'}
            anchor={{ x: 0.5, y: 1.0 }}
          >
            <View style={styles.dropMarkerContainer}>
              <View style={styles.dropMarkerBadge}>
                <Navigation size={14} color="#FFFFFF" />
              </View>
              <View style={styles.dropMarkerPin} />
            </View>
          </Marker>
        )}

        {/* Real Assigned Chauffeur Marker with Floating ETA Badge */}
        {driverLocation && driverLocation.lat && driverLocation.lng && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Orange Chauffeur"
            description={isInProgress ? 'En route to destination' : 'En route to pickup'}
            anchor={{ x: 0.5, y: 0.8 }}
          >
            <View style={styles.driverCarMarkerWrapper}>
              <View style={styles.carEtaBadge}>
                <Text style={styles.carEtaText}>
                  {routeDurationMin ? `${routeDurationMin} min` : '3 min'}
                </Text>
              </View>
              <View style={styles.driverCarMarker}>
                <Car size={15} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}

        {/* Route Line - Crisp Charcoal Black Contrast (as in reference mockup) */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#18181B"
            strokeWidth={4.5}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* CENTER PIN FOR "SET ON MAP" MODE */}
      {isPinPickerMode && (
        <View pointerEvents="none" style={styles.centerPinContainer}>
          <View style={styles.pinTooltip}>
            <Text style={styles.pinTooltipText}>
              Drag map to place {pinPickerTarget === 'pickup' ? 'pickup point' : 'destination'}
            </Text>
          </View>
          <View style={[styles.centerPinHead, pinPickerTarget === 'pickup' && { backgroundColor: '#F97316' }]}>
            {pinPickerTarget === 'pickup' ? (
              <MapPin size={18} color="#FFFFFF" />
            ) : (
              <Navigation size={18} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.centerPinShadow} />
        </View>
      )}

      {/* Floating Status / Route Info Pill */}
      {hasValidDrop && (
        <View style={styles.floatingRoutePill}>
          <View style={[styles.liveIndicator, isInProgress && { backgroundColor: '#22C55E' }]} />
          <Text style={styles.floatingRouteText}>
            {isInProgress
              ? '🟢 Live Chauffeur GPS to Destination'
              : status === 'accepted' || status === 'arrived'
              ? '🚗 Chauffeur En Route to Pickup'
              : routeDistanceKm && routeDurationMin
              ? `⚡ ${routeDistanceKm} km · ~${routeDurationMin} mins`
              : '📍 Route Preview'}
          </Text>
        </View>
      )}

      {/* Recenter GPS Floating Button - Crisp White Pill */}
      {onRecenterPress && (
        <TouchableOpacity
          style={styles.recenterBtn}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (mapRef.current && pickup.lat) {
              mapRef.current.animateToRegion(
                {
                  latitude: pickup.lat,
                  longitude: pickup.lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                },
                500
              );
            }
            onRecenterPress();
          }}
        >
          <Crosshair size={20} color="#F97316" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  pickupPulseContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupPulseOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.22)',
    borderWidth: 2,
    borderColor: '#F97316',
    position: 'absolute',
  },
  pickupPulseInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dropMarkerContainer: {
    alignItems: 'center',
  },
  dropMarkerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#18181B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  dropMarkerPin: {
    width: 2,
    height: 6,
    backgroundColor: '#18181B',
  },
  driverCarMarkerWrapper: {
    alignItems: 'center',
  },
  carEtaBadge: {
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  carEtaText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  driverCarMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F97316',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingRoutePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },
  floatingRouteText: {
    color: '#18181B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTooltip: {
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinTooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  centerPinHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  centerPinShadow: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 2,
  },
});
