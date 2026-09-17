import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin, Navigation, Car } from 'lucide-react-native';

interface RideMapProps {
  pickup: { lat: number; lng: number; name?: string };
  drop: { lat: number; lng: number; name?: string };
  driverLocation?: { lat: number; lng: number } | null;
  height?: number;
  interactive?: boolean;
}

// Dark luxury map styling for Apple & Google Maps
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#161922' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#161922' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a221f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#272d3b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f131a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

export function RideMap({ pickup, drop, driverLocation, height = 220, interactive = true }: RideMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && pickup.lat && drop.lat) {
      const coords = [{ latitude: pickup.lat, longitude: pickup.lng }, { latitude: drop.lat, longitude: drop.lng }];
      if (driverLocation?.lat && driverLocation?.lng) {
        coords.push({ latitude: driverLocation.lat, longitude: driverLocation.lng });
      }

      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [pickup.lat, pickup.lng, drop.lat, drop.lng, driverLocation?.lat, driverLocation?.lng]);

  const midLat = (pickup.lat + drop.lat) / 2;
  const midLng = (pickup.lng + drop.lng) / 2;

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        initialRegion={{
          latitude: midLat || 28.6139,
          longitude: midLng || 77.209,
          latitudeDelta: Math.abs(pickup.lat - drop.lat) * 1.5 || 0.09,
          longitudeDelta: Math.abs(pickup.lng - drop.lng) * 1.5 || 0.09,
        }}
      >
        {/* Pickup Marker */}
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          title="Pickup Location"
          description={pickup.name || 'Your location'}
        >
          <View style={styles.pickupPin}>
            <View style={styles.innerPinGreen} />
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker
          coordinate={{ latitude: drop.lat, longitude: drop.lng }}
          title="Drop Destination"
          description={drop.name || 'Destination'}
        >
          <View style={styles.dropPin}>
            <View style={styles.innerPinOrange} />
          </View>
        </Marker>

        {/* Driver Live Marker (When assigned) */}
        {driverLocation && driverLocation.lat && driverLocation.lng && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Orange Chauffeur"
            description="Driver on route"
          >
            <View style={styles.driverCarMarker}>
              <Car size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* Route Line */}
        <Polyline
          coordinates={[
            { latitude: pickup.lat, longitude: pickup.lng },
            ...(driverLocation ? [{ latitude: driverLocation.lat, longitude: driverLocation.lng }] : []),
            { latitude: drop.lat, longitude: drop.lng },
          ]}
          strokeColor="#F56B00"
          strokeWidth={3.5}
          lineDashPattern={[0]}
        />
      </MapView>

      {/* Floating Tag */}
      <View style={styles.floatingPill}>
        <View style={styles.liveIndicator} />
        <Text style={styles.floatingPillText}>Live Route Preview</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#232936',
    backgroundColor: '#161922',
    position: 'relative',
    marginBottom: 12,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  pickupPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerPinGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  dropPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 107, 0, 0.25)',
    borderWidth: 2,
    borderColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerPinOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F56B00',
  },
  driverCarMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F56B00',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  floatingPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 18, 24, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  floatingPillText: {
    color: '#D1D5DB',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
