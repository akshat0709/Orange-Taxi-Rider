import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { MapPin, Navigation, Car, Crosshair, Map, Home, Briefcase } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
interface RideMapProps {
  pickup: { lat: number; lng: number; name?: string };
  drop?: { lat: number; lng: number; name?: string };
  driverLocation?: { lat: number; lng: number } | null;
  status?: string;
  height?: number | string;
  interactive?: boolean;
  isPinPickerMode?: boolean;
  pinPickerTarget?: 'pickup' | 'drop' | 'home' | 'work';
  onPinLocationChange?: (coords: { lat: number; lng: number }) => void;
  onMapPress?: (coords: { lat: number; lng: number }) => void;
  onRecenterPress?: () => void;
  routeDistanceKm?: number;
  routeDurationMin?: number;
  theme?: 'light' | 'dark';
}

const { width } = Dimensions.get('window');

// Minimalist, modern light grayscale cartography for clean Uber-style look (Option B - Default)
export const MINIMAL_LIGHT_MAP_STYLE = [
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

// Executive, high-contrast dark cartography for dark theme mode
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }, { weight: 2 }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#F8FAFC' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }, { weight: 1 }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }, { weight: 1.5 }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0284C7' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#38BDF8' }] },
];

// ---------------------------------------------------------------------------
// GEODESIC & BEARING HELPERS FOR SMOOTH CAR MOTION
// ---------------------------------------------------------------------------
export function calculateBearing(startLat: number, startLng: number, endLat: number, endLng: number): number {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const endLatRad = (endLat * Math.PI) / 180;
  const endLngRad = (endLng * Math.PI) / 180;

  const dLng = endLngRad - startLngRad;
  const y = Math.sin(dLng) * Math.cos(endLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(endLatRad) -
    Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  theme = 'light',
}: RideMapProps) {
  const mapRef = useRef<MapView>(null);
  const isInProgress = status === 'in_progress';
  const hasValidDrop = drop && drop.lat && drop.lng && (drop.lat !== pickup.lat || drop.lng !== pickup.lng);

  // -------------------------------------------------------------------------
  // ULTRA-SMOOTH 60 FPS GLIDING CAR INTERPOLATION
  // -------------------------------------------------------------------------
  const [smoothCarCoord, setSmoothCarCoord] = React.useState<{ lat: number; lng: number } | null>(
    driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null
  );
  const [carBearing, setCarBearing] = React.useState<number>(0);
  const currentPosRef = useRef<{ lat: number; lng: number } | null>(
    driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null
  );
  const animFrameRef = useRef<number | null>(null);
  const lastFitStatusRef = useRef<string>('');

  useEffect(() => {
    if (!driverLocation || !driverLocation.lat || !driverLocation.lng) return;

    // First time receiving location: initialize immediately
    if (!currentPosRef.current) {
      currentPosRef.current = { lat: driverLocation.lat, lng: driverLocation.lng };
      setSmoothCarCoord({ lat: driverLocation.lat, lng: driverLocation.lng });
      return;
    }

    const startLat = currentPosRef.current.lat;
    const startLng = currentPosRef.current.lng;
    const endLat = driverLocation.lat;
    const endLng = driverLocation.lng;

    // Only animate if movement is meaningful (>= 0.5 meters)
    const distM = haversineMeters(startLat, startLng, endLat, endLng);
    if (distM < 0.5) return;

    // Calculate heading / bearing angle for vehicle rotation
    const bearing = calculateBearing(startLat, startLng, endLat, endLng);
    setCarBearing(bearing);

    // Cancel running animation frame to prevent jitter
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const startTime = Date.now();
    const duration = 3800; // Smooth 3.8-second glide matching 4s server polling cadence

    function animateStep() {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth linear glide
      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLng = startLng + (endLng - startLng) * progress;

      currentPosRef.current = { lat: currentLat, lng: currentLng };
      setSmoothCarCoord({ lat: currentLat, lng: currentLng });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateStep);
      } else {
        currentPosRef.current = { lat: endLat, lng: endLng };
        setSmoothCarCoord({ lat: endLat, lng: endLng });
        animFrameRef.current = null;
      }
    }

    animFrameRef.current = requestAnimationFrame(animateStep);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [driverLocation?.lat, driverLocation?.lng]);

  // Fit camera when status changes or on initial mount (never jitter during 4s ticks)
  useEffect(() => {
    if (isPinPickerMode) return;

    if (mapRef.current && pickup.lat) {
      const statusChanged = lastFitStatusRef.current !== status;
      lastFitStatusRef.current = status;

      if (!statusChanged && lastFitStatusRef.current !== '') {
        return; // Skip refitting to prevent viewport jerk while car is moving
      }

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
          edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
          animated: true,
        });
      } else {
        // Idle / Explore mode
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
  }, [pickup.lat, pickup.lng, drop?.lat, drop?.lng, status, isPinPickerMode]);

  // Target point for car (pickup if en route to customer; drop if ride in progress)
  const targetPoint = isInProgress && hasValidDrop && drop ? drop : pickup;
  const currentCarPos = smoothCarCoord || driverLocation;

  // Real-time dynamic ETA calculation from live moving vehicle to target
  const distToTargetM = currentCarPos && targetPoint?.lat && targetPoint?.lng
    ? haversineMeters(currentCarPos.lat, currentCarPos.lng, targetPoint.lat, targetPoint.lng)
    : null;
  const dynamicCarEtaMins = distToTargetM !== null
    ? Math.max(1, Math.round((distToTargetM / 1000) / 0.45))
    : routeDurationMin || 3;

  const currentCarCoord = currentCarPos?.lat && currentCarPos?.lng
    ? { latitude: currentCarPos.lat, longitude: currentCarPos.lng }
    : { latitude: pickup.lat, longitude: pickup.lng };

  // Polyline dynamically tracks moving car to target
  const polylineCoords = isInProgress && hasValidDrop && drop
    ? [currentCarCoord, { latitude: drop.lat, longitude: drop.lng }]
    : (status === 'accepted' || status === 'arrived') && (currentCarPos?.lat)
    ? [currentCarCoord, { latitude: pickup.lat, longitude: pickup.lng }]
    : hasValidDrop && drop
    ? [
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
        customMapStyle={theme === 'dark' ? DARK_MAP_STYLE : MINIMAL_LIGHT_MAP_STYLE}
        userInterfaceStyle={theme === 'dark' ? 'dark' : 'light'}
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

        {/* Real Assigned Chauffeur Marker with Floating ETA Badge & Heading Rotation */}
        {currentCarPos && currentCarPos.lat && currentCarPos.lng && (
          <Marker
            coordinate={{ latitude: currentCarPos.lat, longitude: currentCarPos.lng }}
            title="Orange Chauffeur"
            description={isInProgress ? 'En route to destination' : 'En route to pickup'}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <View style={styles.driverCarMarkerWrapper}>
              <View style={styles.carEtaBadge}>
                <Text style={styles.carEtaText}>
                  {dynamicCarEtaMins} min
                </Text>
              </View>
              <View
                style={[
                  styles.driverCarMarker,
                  { transform: [{ rotate: `${carBearing}deg` }] },
                ]}
              >
                <Car size={16} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}

        {/* Route Line - Crisp Charcoal Black in Light Mode, Electric Orange in Dark Mode */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={theme === 'dark' ? '#F97316' : '#18181B'}
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
              {pinPickerTarget === 'home'
                ? 'Drag map to pinpoint exact home address'
                : pinPickerTarget === 'work'
                ? 'Drag map to pinpoint exact office / workplace'
                : `Drag map to place ${pinPickerTarget === 'pickup' ? 'pickup point' : 'destination'}`}
            </Text>
          </View>
          <View
            style={[
              styles.centerPinHead,
              (pinPickerTarget === 'pickup' || pinPickerTarget === 'home') && { backgroundColor: '#EA580C' },
              pinPickerTarget === 'work' && { backgroundColor: '#2563EB' },
            ]}
          >
            {pinPickerTarget === 'home' ? (
              <Home size={18} color="#FFFFFF" />
            ) : pinPickerTarget === 'work' ? (
              <Briefcase size={18} color="#FFFFFF" />
            ) : pinPickerTarget === 'pickup' ? (
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
        <View style={[styles.floatingRoutePill, theme === 'dark' && styles.floatingRoutePillDark]}>
          <View style={[styles.liveIndicator, isInProgress && { backgroundColor: '#22C55E' }]} />
          <Text style={[styles.floatingRouteText, theme === 'dark' && styles.floatingRouteTextDark]}>
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
          style={[styles.recenterBtn, theme === 'dark' && styles.recenterBtnDark]}
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
  floatingRoutePillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  floatingRouteTextDark: {
    color: '#F8FAFC',
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
  recenterBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
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
