export type IncidentType = 'Flood' | 'Fire' | 'Landslide' | 'Cyclone' | 'Tsunami' | 'Other';

export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type IncidentStatus = 'Reported' | 'Under Review' | 'In Progress' | 'Resolved';

export interface IncidentRow {
  id: number;
  incident_type: IncidentType | string;
  title: string;
  description: string;
  location: string;
  latitude: number | string | null;
  longitude: number | string | null;
  severity: IncidentSeverity | string;
  photo_url: string | null;
  status: IncidentStatus | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Incident {
  id: number;
  incidentType: string;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: string;
  photoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  incidentType?: unknown;
  title?: unknown;
  description?: unknown;
  location?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  severity?: unknown;
  photoUrl?: unknown;
}

export interface UpdateIncidentStatusInput {
  status?: unknown;
}

export interface ValidatedIncidentInput {
  incidentType: IncidentType;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: IncidentSeverity;
  photoUrl: string | null;
}
