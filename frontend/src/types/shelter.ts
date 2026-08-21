export type ShelterStatus = 'Open' | 'Limited' | 'Full' | 'Closed';

export type RoadStatus = 'Safe' | 'Caution' | 'Blocked';

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
  status: ShelterStatus | string;
  contactNumber: string | null;
  facilities: string[];
  createdAt: string | null;
  updatedAt: string | null;
  isAreaMatch: boolean;
}

export interface EvacuationRoute {
  id: number;
  shelterId: number;
  startArea: string;
  routeName: string | null;
  distanceKm: number | null;
  estimatedTimeMinutes: number | null;
  routeInstructions: string;
  roadStatus: RoadStatus | string;
  warningMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isAreaMatch: boolean;
}
