import { sql } from '../config/database.js';
import type {
  CreateShelterInput,
  EvacuationRoute,
  EvacuationRouteRow,
  Shelter,
  ShelterRow,
  UpdateShelterInput,
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

function optionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function optionalInteger(value: number | string | null | undefined) {
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

  await getShelterById(String(numericId), residentLocation);

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
      CASE LOWER(COALESCE(evacuation_routes.road_status, ''))
        WHEN 'safe' THEN 0
        WHEN 'caution' THEN 1
        WHEN 'blocked' THEN 2
        ELSE 3
      END ASC,
      COALESCE(evacuation_routes.updated_at, evacuation_routes.created_at) DESC NULLS LAST,
      evacuation_routes.id DESC
  `;

  return (rows as EvacuationRouteRow[]).map(toEvacuationRoute);
}

function validateCreateShelterInput(input: CreateShelterInput) {
  const name = trimmedText(input.name);
  const area = trimmedText(input.area);
  const address = optionalText(input.address);
  const latitude = optionalNumber(input.latitude);
  const longitude = optionalNumber(input.longitude);
  const capacity = optionalInteger(input.capacity);
  const currentOccupancy = optionalInteger(input.currentOccupancy);
  const status = optionalText(input.status);
  const contactNumber = optionalText(input.contactNumber);
  const facilities = input.facilities ?? [];
  const fieldErrors: Record<string, string> = {};

  if (!name) {
    fieldErrors.name = 'Shelter name is required.';
  }

  if (!area) {
    fieldErrors.area = 'Area is required.';
  }

  if (capacity !== null && capacity < 0) {
    fieldErrors.capacity = 'Capacity must be a positive number.';
  }

  if (currentOccupancy !== null && currentOccupancy < 0) {
    fieldErrors.currentOccupancy = 'Current occupancy must be a positive number.';
  }

  if (capacity !== null && currentOccupancy !== null && currentOccupancy > capacity) {
    fieldErrors.currentOccupancy = 'Current occupancy cannot exceed capacity.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ShelterServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    name,
    area,
    address,
    latitude,
    longitude,
    capacity,
    currentOccupancy,
    status: status || DEFAULT_SHELTER_STATUS,
    contactNumber,
    facilities: JSON.stringify(facilities),
  };
}

export async function createShelter(input: CreateShelterInput) {
  const validated = validateCreateShelterInput(input);

  const rows = await sql`
    INSERT INTO shelters (name, area, address, latitude, longitude, capacity, current_occupancy, status, contact_number, facilities)
    VALUES (
      ${validated.name},
      ${validated.area},
      ${validated.address},
      ${validated.latitude},
      ${validated.longitude},
      ${validated.capacity},
      ${validated.currentOccupancy},
      ${validated.status},
      ${validated.contactNumber},
      ${validated.facilities}
    )
    RETURNING id, name, area, address, latitude, longitude, capacity, current_occupancy, status, contact_number, facilities, created_at, updated_at
  `;

  const createdShelter = rows[0] as ShelterRow | undefined;

  if (!createdShelter) {
    throw new ShelterServiceError(500, 'Shelter creation could not be completed.');
  }

  return toShelter(createdShelter);
}

function validateUpdateShelterInput(input: UpdateShelterInput) {
  const fieldErrors: Record<string, string> = {};

  if (input.name !== undefined) {
    const name = trimmedText(input.name);
    if (!name) {
      fieldErrors.name = 'Shelter name cannot be empty.';
    }
  }

  if (input.area !== undefined) {
    const area = trimmedText(input.area);
    if (!area) {
      fieldErrors.area = 'Area cannot be empty.';
    }
  }

  if (input.capacity !== undefined) {
    const capacity = optionalInteger(input.capacity);
    if (capacity !== null && capacity < 0) {
      fieldErrors.capacity = 'Capacity must be a positive number.';
    }
  }

  if (input.currentOccupancy !== undefined) {
    const currentOccupancy = optionalInteger(input.currentOccupancy);
    if (currentOccupancy !== null && currentOccupancy < 0) {
      fieldErrors.currentOccupancy = 'Current occupancy must be a positive number.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ShelterServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    name: input.name !== undefined ? trimmedText(input.name) : undefined,
    area: input.area !== undefined ? trimmedText(input.area) : undefined,
    address: input.address !== undefined ? optionalText(input.address) : undefined,
    latitude: input.latitude !== undefined ? optionalNumber(input.latitude) : undefined,
    longitude: input.longitude !== undefined ? optionalNumber(input.longitude) : undefined,
    capacity: input.capacity !== undefined ? optionalInteger(input.capacity) : undefined,
    currentOccupancy: input.currentOccupancy !== undefined ? optionalInteger(input.currentOccupancy) : undefined,
    status: input.status !== undefined ? optionalText(input.status) : undefined,
    contactNumber: input.contactNumber !== undefined ? optionalText(input.contactNumber) : undefined,
    facilities: input.facilities !== undefined ? JSON.stringify(input.facilities) : undefined,
  };
}

export async function updateShelter(id: string, input: UpdateShelterInput) {
  const validated = validateUpdateShelterInput(input);

  const updateFields: string[] = [];
  const updateValues: unknown[] = [];

  if (validated.name !== undefined) {
    updateFields.push('name = $1');
    updateValues.push(validated.name);
  }
  if (validated.area !== undefined) {
    updateFields.push(`area = $${updateValues.length + 1}`);
    updateValues.push(validated.area);
  }
  if (validated.address !== undefined) {
    updateFields.push(`address = $${updateValues.length + 1}`);
    updateValues.push(validated.address);
  }
  if (validated.latitude !== undefined) {
    updateFields.push(`latitude = $${updateValues.length + 1}`);
    updateValues.push(validated.latitude);
  }
  if (validated.longitude !== undefined) {
    updateFields.push(`longitude = $${updateValues.length + 1}`);
    updateValues.push(validated.longitude);
  }
  if (validated.capacity !== undefined) {
    updateFields.push(`capacity = $${updateValues.length + 1}`);
    updateValues.push(validated.capacity);
  }
  if (validated.currentOccupancy !== undefined) {
    updateFields.push(`current_occupancy = $${updateValues.length + 1}`);
    updateValues.push(validated.currentOccupancy);
  }
  if (validated.status !== undefined) {
    updateFields.push(`status = $${updateValues.length + 1}`);
    updateValues.push(validated.status);
  }
  if (validated.contactNumber !== undefined) {
    updateFields.push(`contact_number = $${updateValues.length + 1}`);
    updateValues.push(validated.contactNumber);
  }
  if (validated.facilities !== undefined) {
    updateFields.push(`facilities = $${updateValues.length + 1}`);
    updateValues.push(validated.facilities);
  }

  if (updateFields.length === 0) {
    throw new ShelterServiceError(400, 'No fields provided for update.');
  }

  updateFields.push(`updated_at = NOW()`);
  updateValues.push(id);

  const query = `
    UPDATE shelters
    SET ${updateFields.join(', ')}
    WHERE id = $${updateValues.length}
    RETURNING id, name, area, address, latitude, longitude, capacity, current_occupancy, status, contact_number, facilities, created_at, updated_at
  `;

  const rows = await sql.query(query, updateValues);

  const updatedShelter = rows[0] as ShelterRow | undefined;

  if (!updatedShelter) {
    throw new ShelterServiceError(404, 'Shelter not found.');
  }

  return toShelter(updatedShelter);
}
