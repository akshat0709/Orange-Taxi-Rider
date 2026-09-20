export interface VehicleCategory {
  id: string;
  code: string;
  name: string;
  tagline: string;
  seats: number;
  base_fare: number;
  per_km: number;
  minimum_fare: number;
  sort_order: number;
}

export interface ServiceArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  is_airport: boolean;
}

export interface Booking {
  id: string;
  reference: string;
  status: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickup_area: string;
  drop_area: string;
  estimated_fare: number;
  vehicle_name: string;
  ride_otp: string;
  driver_id?: string | null;
  distance_km?: number;
  duration_min?: number;
  created_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  vehicle_model: string;
  vehicle_number: string;
  rating: number;
  total_rides?: number;
  current_lat?: number;
  current_lng?: number;
}
