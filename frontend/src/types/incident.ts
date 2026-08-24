export const incidentSeverityOptions = ['Low', 'Medium', 'High', 'Critical'] as const;

export const incidentStatusWorkflow = [
  'Reported',
  'Under Review',
  'In Progress',
  'Resolved',
] as const;

export type IncidentSeverity = (typeof incidentSeverityOptions)[number];

export type IncidentStatus = (typeof incidentStatusWorkflow)[number];

export const incidentTypeOptions = ['Flood', 'Fire', 'Landslide', 'Cyclone', 'Tsunami', 'Other'] as const;

export type IncidentType = (typeof incidentTypeOptions)[number];

export interface Incident {
  id: number;
  incidentType: IncidentType;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: IncidentSeverity;
  photoUrl: string | null;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  photos: IncidentPhoto[];
}

export interface IncidentPhoto {
  id: number;
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export type SelectedIncidentPhoto = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  width: number;
  height: number;
  file: File | null;
};

export interface CreateIncidentPayload {
  incidentType: IncidentType;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: IncidentSeverity;
  photoUrl: string | null;
}

export type IncidentFieldErrors = Partial<
  Record<
    keyof CreateIncidentPayload | 'latitudeText' | 'longitudeText',
    string
  >
>;
