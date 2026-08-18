import { sql } from '../config/database.js';
import type {
  EvacuationRoute,
  EvacuationRouteRow,
  Shelter,
  ShelterRow,
} from '../types/shelter.js';

const DEFAULT_SHELTER_STATUS = 'Unknown';
const DEFAULT_ROAD_STATUS = 'Status pending';

export class ShelterServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ShelterServiceError';
  }
}

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: string | null | undefined) {
  const text = trimmedText(value);
  return text || null;
}

function optionalNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function optionalInteger(value: number | string | null) {
  const numericValue = optionalNumber(value);

  return numericValue === null ? null : Math.trunc(numericValue);
}

function optionalTimestamp(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : String(value);
}

function numericShelterId(shelterId: string) {
  const numericValue = Number(shelterId);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new ShelterServiceError(400, 'Invalid shelter id.');
  }

  return numericValue;
}

function splitFacilities(value: string | null) {
  const text = optionalText(value);

  if (!text) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(text);

    if (Array.isArray(parsedValue)) {
      return parsedValue
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    // Facilities are commonly stored as plain text in Sprint 1 seed data.
  }

  return text
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function availableSpaces(capacity: number | null, currentOccupancy: number | null) {
  if (capacity === null || currentOccupancy === null) {
    return null;
  }

  return Math.max(capacity - currentOccupancy, 0);
}

function toShelter(row: ShelterRow): Shelter {
  const capacity = optionalInteger(row.capacity);
  const currentOccupancy = optionalInteger(row.current_occupancy);

  return {
    id: row.id,
    name: row.name,
    area: row.area,
    address: optionalText(row.address),
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    capacity,
    currentOccupancy,
    availableSpaces: availableSpaces(capacity, currentOccupancy),
    status: optionalText(row.status) ?? DEFAULT_SHELTER_STATUS,
    contactNumber: optionalText(row.contact_number),
    facilities: splitFacilities(row.facilities),
    createdAt: optionalTimestamp(row.created_at),
    updatedAt: optionalTimestamp(row.updated_at),
    isAreaMatch: Boolean(row.is_area_match),
  };
}

function toEvacuationRoute(row: EvacuationRouteRow): EvacuationRoute {
  return {
    id: row.id,
    shelterId: row.shelter_id,
    startArea: row.start_area,
    routeName: optionalText(row.route_name),
    distanceKm: optionalNumber(row.distance_km),
    estimatedTimeMinutes: optionalInteger(row.estimated_time_minutes),
    routeInstructions: row.route_instructions,
    roadStatus: optionalText(row.road_status) ?? DEFAULT_ROAD_STATUS,
    warningMessage: optionalText(row.warning_message),
    createdAt: optionalTimestamp(row.created_at),
    updatedAt: optionalTimestamp(row.updated_at),
    isAreaMatch: Boolean(row.is_area_match),
  };
}

export async function getShelters(residentLocation: string | null | undefined) {
  const location = trimmedText(residentLocation);

  const rows = await sql`
    WITH resident_context AS (
      SELECT ${location}::text AS resident_area
    )
    SELECT
      shelters.id,
      shelters.name,
      shelters.area,
      shelters.address,
      shelters.latitude,
      shelters.longitude,
      shelters.capacity,
      shelters.current_occupancy,
      shelters.status,
      shelters.contact_number,
      shelters.facilities,
      shelters.created_at,
      shelters.updated_at,
      (
        resident_context.resident_area <> ''
        AND (
          LOWER(shelters.area) = LOWER(resident_context.resident_area)
          OR LOWER(shelters.area) LIKE '%' || LOWER(resident_context.resident_area) || '%'
          OR LOWER(resident_context.resident_area) LIKE '%' || LOWER(shelters.area) || '%'
        )
      ) AS is_area_match
    FROM shelters
    CROSS JOIN resident_context
    ORDER BY
      CASE
        WHEN (
          resident_context.resident_area <> ''
          AND (
            LOWER(shelters.area) = LOWER(resident_context.resident_area)
            OR LOWER(shelters.area) LIKE '%' || LOWER(resident_context.resident_area) || '%'
            OR LOWER(resident_context.resident_area) LIKE '%' || LOWER(shelters.area) || '%'
          )
        )
        THEN 0
        ELSE 1
      END ASC,
      CASE LOWER(COALESCE(shelters.status, ''))
        WHEN 'open' THEN 0
        WHEN 'limited' THEN 1
        WHEN 'full' THEN 2
        WHEN 'closed' THEN 3
        ELSE 4
      END ASC,
      shelters.name ASC
  `;

  return (rows as ShelterRow[]).map(toShelter);
}

export async function getShelterById(shelterId: string, residentLocation?: string | null) {
  const numericId = numericShelterId(shelterId);
  const location = trimmedText(residentLocation);

  const rows = await sql`
    WITH resident_context AS (
      SELECT ${location}::text AS resident_area
    )
    SELECT
      shelters.id,
      shelters.name,
      shelters.area,
      shelters.address,
      shelters.latitude,
      shelters.longitude,
      shelters.capacity,
      shelters.current_occupancy,
      shelters.status,
      shelters.contact_number,
      shelters.facilities,
      shelters.created_at,
      shelters.updated_at,
      (
        resident_context.resident_area <> ''
        AND (
          LOWER(shelters.area) = LOWER(resident_context.resident_area)
          OR LOWER(shelters.area) LIKE '%' || LOWER(resident_context.resident_area) || '%'
          OR LOWER(resident_context.resident_area) LIKE '%' || LOWER(shelters.area) || '%'
        )
      ) AS is_area_match
    FROM shelters
    CROSS JOIN resident_context
    WHERE shelters.id = ${numericId}
    LIMIT 1
  `;

  const shelter = rows[0] as ShelterRow | undefined;

  if (!shelter) {
    throw new ShelterServiceError(404, 'Safe shelter not found.');
  }

  return toShelter(shelter);
}

export async function getShelterRoutes(shelterId: string, residentLocation: string | null | undefined) {
  const numericId = numericShelterId(shelterId);
  const location = trimmedText(residentLocation);

  const rows = await sql`
    WITH resident_context AS (
      SELECT ${location}::text AS resident_area
    )
    SELECT
      evacuation_routes.id,
      evacuation_routes.shelter_id,
      evacuation_routes.start_area,
      evacuation_routes.route_name,
      evacuation_routes.distance_km,
      evacuation_routes.estimated_time_minutes,
      evacuation_routes.route_instructions,
      evacuation_routes.road_status,
      evacuation_routes.warning_message,
      evacuation_routes.created_at,
      evacuation_routes.updated_at,
      (
        resident_context.resident_area <> ''
        AND (
          LOWER(evacuation_routes.start_area) = LOWER(resident_context.resident_area)
          OR LOWER(evacuation_routes.start_area) LIKE '%' || LOWER(resident_context.resident_area) || '%'
          OR LOWER(resident_context.resident_area) LIKE '%' || LOWER(evacuation_routes.start_area) || '%'
        )
      ) AS is_area_match
    FROM evacuation_routes
    CROSS JOIN resident_context
    WHERE evacuation_routes.shelter_id = ${numericId}
    ORDER BY
      CASE
        WHEN (
          resident_context.resident_area <> ''
          AND (
            LOWER(evacuation_routes.start_area) = LOWER(resident_context.resident_area)
            OR LOWER(evacuation_routes.start_area) LIKE '%' || LOWER(resident_context.resident_area) || '%'
            OR LOWER(resident_context.resident_area) LIKE '%' || LOWER(evacuation_routes.start_area) || '%'
          )
        )
        THEN 0
        ELSE 1
      END ASC,
      evacuation_routes.id ASC
  `;

  return (rows as EvacuationRouteRow[]).map(toEvacuationRoute);
}
