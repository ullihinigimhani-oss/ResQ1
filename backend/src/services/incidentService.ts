import { sql } from '../config/database.js';
import type {
  CreateIncidentInput,
  Incident,
  IncidentRow,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  UpdateIncidentStatusInput,
  ValidatedIncidentInput,
} from '../types/incident.js';

const INCIDENT_TYPES = new Set<IncidentType>(['Flood', 'Fire', 'Landslide', 'Cyclone', 'Tsunami', 'Other']);
const INCIDENT_SEVERITIES = new Set<IncidentSeverity>(['Low', 'Medium', 'High', 'Critical']);
const INCIDENT_STATUSES = new Set<IncidentStatus>([
  'Reported',
  'Under Review',
  'In Progress',
  'Resolved',
]);
const DEFAULT_INCIDENT_STATUS: IncidentStatus = 'Reported';

export class IncidentServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'IncidentServiceError';
  }
}

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown) {
  const text = trimmedText(value);
  return text || null;
}

function optionalCoordinate(value: unknown, field: 'latitude' | 'longitude', errors: Record<string, string>) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const coordinate = typeof value === 'number' ? value : Number(trimmedText(value));

  if (!Number.isFinite(coordinate)) {
    errors[field] = `${field === 'latitude' ? 'Latitude' : 'Longitude'} must be a valid number.`;
    return null;
  }

  if (field === 'latitude' && (coordinate < -90 || coordinate > 90)) {
    errors.latitude = 'Latitude must be between -90 and 90.';
  }

  if (field === 'longitude' && (coordinate < -180 || coordinate > 180)) {
    errors.longitude = 'Longitude must be between -180 and 180.';
  }

  return coordinate;
}

function formatTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function optionalNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    incidentType: row.incident_type,
    title: row.title,
    description: row.description,
    location: row.location,
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    severity: row.severity,
    photoUrl: row.photo_url,
    status: row.status,
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function validateCreateIncidentInput(input: CreateIncidentInput): ValidatedIncidentInput {
  const title = trimmedText(input.title);
  const description = trimmedText(input.description);
  const location = trimmedText(input.location);
  const incidentType = trimmedText(input.incidentType) || 'Flood';
  const severity = trimmedText(input.severity);
  const fieldErrors: Record<string, string> = {};

  if (!title) {
    fieldErrors.title = 'Please enter an incident title.';
  } else if (title.length > 150) {
    fieldErrors.title = 'Incident title must be 150 characters or fewer.';
  }

  if (!description) {
    fieldErrors.description = 'Please describe the flood incident.';
  }

  if (!location) {
    fieldErrors.location = 'Please provide the affected location.';
  } else if (location.length > 150) {
    fieldErrors.location = 'Location must be 150 characters or fewer.';
  }

  if (!INCIDENT_TYPES.has(incidentType as IncidentType)) {
    fieldErrors.incidentType = 'Please select a valid incident type.';
  }

  if (!severity) {
    fieldErrors.severity = 'Please select the severity level.';
  } else if (!INCIDENT_SEVERITIES.has(severity as IncidentSeverity)) {
    fieldErrors.severity = 'Choose Low, Medium, High, or Critical.';
  }

  const latitude = optionalCoordinate(input.latitude, 'latitude', fieldErrors);
  const longitude = optionalCoordinate(input.longitude, 'longitude', fieldErrors);
  const photoUrl = optionalText(input.photoUrl);

  if (Object.keys(fieldErrors).length > 0) {
    throw new IncidentServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    incidentType: incidentType as IncidentType,
    title,
    description,
    location,
    latitude,
    longitude,
    severity: severity as IncidentSeverity,
    photoUrl,
  };
}

function validateIncidentStatus(input: UpdateIncidentStatusInput) {
  const status = trimmedText(input.status);

  if (!status) {
    throw new IncidentServiceError(400, 'Please provide an incident status.', {
      status: 'Please provide an incident status.',
    });
  }

  if (!INCIDENT_STATUSES.has(status as IncidentStatus)) {
    throw new IncidentServiceError(400, 'Choose Reported, Under Review, In Progress, or Resolved.', {
      status: 'Choose Reported, Under Review, In Progress, or Resolved.',
    });
  }

  return status as IncidentStatus;
}

function numericIncidentId(incidentId: string) {
  const numericValue = Number(incidentId);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new IncidentServiceError(400, 'Invalid incident id.');
  }

  return numericValue;
}

export async function createIncident(userId: number, input: CreateIncidentInput) {
  const incident = validateCreateIncidentInput(input);

  const rows = await sql`
    INSERT INTO incidents (
      user_id,
      incident_type,
      title,
      description,
      location,
      latitude,
      longitude,
      severity,
      photo_url,
      status
    )
    VALUES (
      ${userId},
      ${incident.incidentType},
      ${incident.title},
      ${incident.description},
      ${incident.location},
      ${incident.latitude},
      ${incident.longitude},
      ${incident.severity},
      ${incident.photoUrl},
      ${DEFAULT_INCIDENT_STATUS}
    )
    RETURNING id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
  `;

  const createdIncident = rows[0] as IncidentRow | undefined;

  if (!createdIncident) {
    throw new IncidentServiceError(500, 'Incident report could not be submitted.');
  }

  return toIncident(createdIncident);
}

export async function getMyIncidents(userId: number) {
  const rows = await sql`
    SELECT id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
    FROM incidents
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return (rows as IncidentRow[]).map(toIncident);
}

export async function getIncidentById(userId: number, incidentId: string) {
  const numericId = numericIncidentId(incidentId);

  const rows = await sql`
    SELECT id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
    FROM incidents
    WHERE id = ${numericId}
      AND user_id = ${userId}
    LIMIT 1
  `;

  const incident = rows[0] as IncidentRow | undefined;

  if (!incident) {
    throw new IncidentServiceError(404, 'Incident report not found.');
  }

  return toIncident(incident);
}

export async function updateIncidentStatus(incidentId: string, input: UpdateIncidentStatusInput) {
  const numericId = numericIncidentId(incidentId);
  const status = validateIncidentStatus(input);

  const rows = await sql`
    UPDATE incidents
    SET status = ${status},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${numericId}
    RETURNING id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
  `;

  const incident = rows[0] as IncidentRow | undefined;

  if (!incident) {
    throw new IncidentServiceError(404, 'Incident report not found.');
  }

  return toIncident(incident);
}
