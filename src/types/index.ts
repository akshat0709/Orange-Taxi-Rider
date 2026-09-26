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
  status: 'searching' | 'scheduled' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickup_area: string;
  pickup_address?: string;
  drop_area: string;
  drop_address?: string;
  estimated_fare: number;
  vehicle_name: string;
  vehicle_number?: string;
  vehicle_model?: string;
  ride_otp: string;
  driver_id?: string | null;
  customer_id?: string;
  vehicle_code?: string;
  payment_method?: string;
  base_fare?: number;
  distance_fare?: number;
  tax_amount?: number;
  distance_km?: number;
  duration_min?: number;
  scheduled_at?: string | null;
  created_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  vehicle_model: string;
  vehicle_number: string;
  vehicle_code?: string;
  photo_url?: string;
  driver_type?: string;
  owns_vehicle?: boolean;
  rating: number;
  total_rides?: number;
  current_lat?: number;
  current_lng?: number;
}
