export const incidentSeverityOptions = ['Low', 'Medium', 'High', 'Critical'] as const;

export const incidentStatusWorkflow = [
  'Reported',
  'Under Review',
  'In Progress',
  'Resolved',
] as const;

export type IncidentSeverity = (typeof incidentSeverityOptions)[number];

export type IncidentStatus = (typeof incidentStatusWorkflow)[number];

export type IncidentType = 'Flood';

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
}

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
