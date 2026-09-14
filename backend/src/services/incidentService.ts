import { sql } from '../config/database.js';
import { cloudinary } from '../config/cloudinary.js';
import type {
  CreateIncidentInput,
  Incident,
  IncidentPhoto,
  IncidentPhotoRow,
  IncidentRow,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  UpdateIncidentInput,
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
  'Verified',
  'Rejected',
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

function toIncidentPhoto(row: IncidentPhotoRow): IncidentPhoto {
  return {
    id: row.id,
    url: cloudinary.url(row.storage_key, { resource_type: "image", secure: true }),
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: optionalNumber(row.width),
    height: optionalNumber(row.height),
    createdAt: formatTimestamp(row.created_at),
  };
}

function toIncident(row: IncidentRow, photos: IncidentPhoto[] = []): Incident {
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
    photos,
  };
}

async function getPhotosByIncidentIds(incidentIds: number[]) {
  if (incidentIds.length === 0) {
    return new Map<number, IncidentPhoto[]>();
  }

  const rows = await sql`
    SELECT id, incident_id, storage_key, original_filename, mime_type, size_bytes, width, height, created_at
    FROM incident_photos
    WHERE incident_id = ANY(${incidentIds})
    ORDER BY created_at ASC
  `;
  const photosByIncidentId = new Map<number, IncidentPhoto[]>();

  for (const row of rows as IncidentPhotoRow[]) {
    const photos = photosByIncidentId.get(row.incident_id) ?? [];
    photos.push(toIncidentPhoto(row));
    photosByIncidentId.set(row.incident_id, photos);
  }

  return photosByIncidentId;
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
    throw new IncidentServiceError(400, 'Invalid incident status.', {
      status: 'Invalid incident status.',
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

export async function getMyIncidents(userId: number, role: string) {
  const isAuthority = role === 'admin' || role === 'authority';

  const rows = await sql`
    SELECT id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
    FROM incidents
    WHERE (${isAuthority} OR user_id = ${userId})
    ORDER BY created_at DESC
  `;

  const incidentRows = rows as IncidentRow[];
  const photosByIncidentId = await getPhotosByIncidentIds(incidentRows.map((incident) => incident.id));

  return incidentRows.map((incident) => toIncident(incident, photosByIncidentId.get(incident.id) ?? []));
}

export async function getIncidentById(userId: number, role: string, incidentId: string) {
  const numericId = numericIncidentId(incidentId);
  const isAuthority = role === 'admin' || role === 'authority';

  const rows = await sql`
    SELECT id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
    FROM incidents
    WHERE id = ${numericId}
      AND (${isAuthority} OR user_id = ${userId} OR status = 'Verified')
    LIMIT 1
  `;

  const incident = rows[0] as IncidentRow | undefined;

  if (!incident) {
    throw new IncidentServiceError(404, 'Incident report not found.');
  }

  const photosByIncidentId = await getPhotosByIncidentIds([incident.id]);
  return toIncident(incident, photosByIncidentId.get(incident.id) ?? []);
}

export async function addIncidentPhoto(
  userId: number,
  incidentId: string,
  photo: { filename: string; originalname: string; mimetype: string; size: number },
) {
  const numericId = numericIncidentId(incidentId);
  const ownerRows = await sql`
    SELECT id FROM incidents WHERE id = ${numericId} AND user_id = ${userId} LIMIT 1
  `;

  if (ownerRows.length === 0) {
    throw new IncidentServiceError(404, 'Incident report not found.');
  }

  const countRows = await sql`
    SELECT COUNT(*)::int AS count FROM incident_photos WHERE incident_id = ${numericId}
  `;
  const count = Number((countRows[0] as { count?: number } | undefined)?.count ?? 0);

  if (count >= 5) {
    throw new IncidentServiceError(400, 'A report can contain a maximum of 5 photos.');
  }

  const rows = await sql`
    INSERT INTO incident_photos (incident_id, storage_key, original_filename, mime_type, size_bytes)
    VALUES (${numericId}, ${photo.filename}, ${photo.originalname}, ${photo.mimetype}, ${photo.size})
    RETURNING id, incident_id, storage_key, original_filename, mime_type, size_bytes, width, height, created_at
  `;
  const addedPhoto = rows[0] as IncidentPhotoRow | undefined;

  if (!addedPhoto) {
    throw new IncidentServiceError(500, 'Photo evidence could not be saved.');
  }

  return toIncidentPhoto(addedPhoto);
}

export async function getIncidentPhotoFile(
  userId: number,
  role: string,
  incidentId: string,
  photoId: string,
) {
  const numericId = numericIncidentId(incidentId);
  const numericPhotoId = Number(photoId);

  if (!Number.isInteger(numericPhotoId) || numericPhotoId <= 0) {
    throw new IncidentServiceError(400, 'Invalid photo id.');
  }

  const rows = await sql`
    SELECT p.storage_key, p.mime_type
    FROM incident_photos p
    INNER JOIN incidents i ON i.id = p.incident_id
    WHERE p.id = ${numericPhotoId}
      AND p.incident_id = ${numericId}
      AND (${role === 'admin' || role === 'authority'} OR i.user_id = ${userId} OR i.status = 'Verified')
    LIMIT 1
  `;
  const file = rows[0] as { storage_key: string; mime_type: string } | undefined;

  if (!file) {
    throw new IncidentServiceError(404, 'Photo evidence not found.');
  }

  return file;
}

export async function removeIncidentPhoto(userId: number, incidentId: string, photoId: string) {
  const numericId = numericIncidentId(incidentId);
  const numericPhotoId = Number(photoId);

  if (!Number.isInteger(numericPhotoId) || numericPhotoId <= 0) {
    throw new IncidentServiceError(400, 'Invalid photo id.');
  }

  const ownerRows = await sql`
    SELECT id, status FROM incidents WHERE id = ${numericId} AND user_id = ${userId} LIMIT 1
  `;

  if (ownerRows.length === 0) {
    throw new IncidentServiceError(404, 'Incident report not found.');
  }
  
  if ((ownerRows[0] as IncidentRow).status !== 'Reported') {
    throw new IncidentServiceError(403, 'You can only remove photos while the incident is in Reported status.');
  }

  const result = await sql`
    DELETE FROM incident_photos
    WHERE id = ${numericPhotoId} AND incident_id = ${numericId}
    RETURNING id
  `;

  if (result.length === 0) {
    throw new IncidentServiceError(404, 'Photo evidence not found.');
  }

  return true;
}

export async function updateIncident(userId: number, incidentId: string, input: UpdateIncidentInput) {
  const numericId = numericIncidentId(incidentId);
  
  const ownerRows = await sql`
    SELECT id, status FROM incidents WHERE id = ${numericId} AND user_id = ${userId} LIMIT 1
  `;

  if (ownerRows.length === 0) {
    throw new IncidentServiceError(404, 'Incident report not found.');
  }
  
  if ((ownerRows[0] as IncidentRow).status !== 'Reported') {
    throw new IncidentServiceError(403, 'You can only edit an incident while it is in Reported status.');
  }

  // Reuse the same validation logic as create
  const incident = validateCreateIncidentInput(input as CreateIncidentInput);

  const rows = await sql`
    UPDATE incidents
    SET incident_type = ${incident.incidentType},
        title = ${incident.title},
        description = ${incident.description},
        location = ${incident.location},
        latitude = ${incident.latitude},
        longitude = ${incident.longitude},
        severity = ${incident.severity},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${numericId}
    RETURNING id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
  `;

  const updatedIncident = rows[0] as IncidentRow | undefined;

  if (!updatedIncident) {
    throw new IncidentServiceError(500, 'Incident report could not be updated.');
  }
  
  const photosByIncidentId = await getPhotosByIncidentIds([updatedIncident.id]);
  return toIncident(updatedIncident, photosByIncidentId.get(updatedIncident.id) ?? []);
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

export async function getAllIncidents(role: string) {
  const isAuthority = role === 'admin' || role === 'authority';

  const rows = await sql`
    SELECT id, incident_type, title, description, location, latitude, longitude, severity, photo_url, status, created_at, updated_at
    FROM incidents
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND status != 'Resolved'
      AND (${isAuthority} OR status = 'Verified')
    ORDER BY created_at DESC
  `;

  return (rows as IncidentRow[]).map(row => toIncident(row));
}
