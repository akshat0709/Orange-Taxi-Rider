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

// Dark luxury map styling for Apple & Google Maps
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#141822' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141822' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A94A6' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#E2E8F0' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1A2321' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4ADE80' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#252B3B' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1E2330' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#384156' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1E2330' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#FCD34D' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#252D3D' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#F56B00' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B101B' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0B101B' }] },
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
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
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
        {/* Pickup Pin (when not actively picking pickup on map) */}
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

        {/* Destination Pin (when not actively picking drop on map) */}
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

        {/* Real Assigned Chauffeur Marker (Only when driver is assigned) */}
        {driverLocation && driverLocation.lat && driverLocation.lng && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Orange Chauffeur"
            description={isInProgress ? 'En route to destination' : 'En route to pickup'}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverCarMarker}>
              <Car size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={isInProgress ? '#22C55E' : '#F56B00'}
            strokeWidth={4.5}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* CENTER PIN FOR "SET ON MAP" MODE (Uber style fixed center pin) */}
      {isPinPickerMode && (
        <View pointerEvents="none" style={styles.centerPinContainer}>
          <View style={styles.pinTooltip}>
            <Text style={styles.pinTooltipText}>
              Drag map to place {pinPickerTarget === 'pickup' ? 'pickup point' : 'destination'}
            </Text>
          </View>
          <View style={[styles.centerPinHead, pinPickerTarget === 'pickup' && { backgroundColor: '#22C55E' }]}>
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

      {/* Recenter GPS Floating Button */}
      {onRecenterPress && (
        <TouchableOpacity
          style={styles.recenterBtn}
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
          <Crosshair size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#232936',
    backgroundColor: '#141822',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  pickupPulseContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupPulseOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 2,
    borderColor: '#22C55E',
    position: 'absolute',
  },
  pickupPulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  dropMarkerContainer: {
    alignItems: 'center',
  },
  dropMarkerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F56B00',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  dropMarkerPin: {
    width: 2,
    height: 6,
    backgroundColor: '#F56B00',
  },
  driverCarMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F56B00',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingRoutePill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(15, 18, 24, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F56B00',
  },
  floatingRouteText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E232F',
    borderWidth: 1,
    borderColor: '#2D3748',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
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
    backgroundColor: 'rgba(15, 18, 24, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 8,
  },
  pinTooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  centerPinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  centerPinShadow: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginTop: 2,
  },
});
