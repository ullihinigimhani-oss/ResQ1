export type ShelterStatus = 'Open' | 'Limited' | 'Full' | 'Closed';

export type RoadStatus = 'Safe' | 'Caution' | 'Blocked';

export interface ShelterRow {
  id: number;
  name: string;
  area: string;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  capacity: number | string | null;
  current_occupancy: number | string | null;
  status: ShelterStatus | string | null;
  contact_number: string | null;
  facilities: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  is_area_match?: boolean | null;
}

export interface Shelter {
  id: number;
  name: string;
  area: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  currentOccupancy: number | null;
  availableSpaces: number | null;
  status: string;
  contactNumber: string | null;
  facilities: string[];
  createdAt: string | null;
  updatedAt: string | null;
  isAreaMatch: boolean;
}

export interface EvacuationRouteRow {
  id: number;
  shelter_id: number;
  start_area: string;
  route_name: string | null;
  distance_km: number | string | null;
  estimated_time_minutes: number | string | null;
  route_instructions: string;
  road_status: RoadStatus | string | null;
  warning_message: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  is_area_match?: boolean | null;
}

export interface EvacuationRoute {
  id: number;
  shelterId: number;
  startArea: string;
  routeName: string | null;
  distanceKm: number | null;
  estimatedTimeMinutes: number | null;
  routeInstructions: string;
  roadStatus: string;
  warningMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isAreaMatch: boolean;
}

export interface CreateShelterInput {
  name: string;
  area: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  currentOccupancy?: number;
  status?: string;
  contactNumber?: string;
  facilities?: string[];
}

export interface UpdateShelterInput {
  name?: string;
  area?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  currentOccupancy?: number;
  status?: string;
  contactNumber?: string;
  facilities?: string[];
}
