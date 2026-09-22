import { sql } from '../config/database.js';
import type {
  CreateSOSRequestInput,
  RespondSOSRequestInput,
  SOSRequest,
  SOSRequestRow,
  SOSRequestWithUser,
  SOSRequestWithVolunteer,
} from '../types/sos.js';

export class SOSServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'SOSServiceError';
  }
}

function formatTimestamp(timestamp: Date | string): string {
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return timestamp.toISOString();
}

function toSOSRequest(row: SOSRequestRow): SOSRequest {
  return {
    id: row.id,
    userId: row.user_id,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status as 'pending' | 'accepted' | 'completed',
    volunteerId: row.volunteer_id,
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at),
  };
}

export async function createSOSRequest(
  userId: number,
  input: CreateSOSRequestInput,
): Promise<SOSRequest> {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);

  if (!latitude || !longitude) {
    throw new SOSServiceError(400, 'Location coordinates are required.', {
      latitude: 'Latitude is required.',
      longitude: 'Longitude is required.',
    });
  }

  const rows = await sql`
    INSERT INTO sos_requests (user_id, latitude, longitude, status)
    VALUES (${userId}, ${latitude}, ${longitude}, 'pending')
    RETURNING id, user_id, latitude, longitude, status, volunteer_id, created_at, updated_at
  `;

  const createdRequest = rows[0] as SOSRequestRow | undefined;

  if (!createdRequest) {
    throw new SOSServiceError(500, 'SOS request could not be created.');
  }

  return toSOSRequest(createdRequest);
}

export async function getActiveSOSRequests(): Promise<SOSRequestWithUser[]> {
  const rows = await sql`
    SELECT 
      sr.id, sr.user_id, sr.latitude, sr.longitude, sr.status, sr.volunteer_id, sr.created_at, sr.updated_at,
      u.full_name as user_name, u.location as user_location
    FROM sos_requests sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.status = 'pending'
    ORDER BY sr.created_at DESC
  `;

  return rows.map((row) => ({
    ...toSOSRequest(row as SOSRequestRow),
    userName: row.user_name,
    userLocation: row.user_location,
  }));
}

export async function getActiveSOSRequestsForVolunteer(volunteerId: number): Promise<SOSRequestWithUser[]> {
  const rows = await sql`
    SELECT 
      sr.id, sr.user_id, sr.latitude, sr.longitude, sr.status, sr.volunteer_id, sr.created_at, sr.updated_at,
      u.full_name as user_name, u.location as user_location
    FROM sos_requests sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM sos_declines sd
      WHERE sd.sos_request_id = sr.id AND sd.volunteer_id = ${volunteerId}
    )
    ORDER BY sr.created_at DESC
  `;

  return rows.map((row) => ({
    ...toSOSRequest(row as SOSRequestRow),
    userName: row.user_name,
    userLocation: row.user_location,
  }));
}

export async function respondToSOSRequest(
  requestId: number,
  volunteerId: number,
  input: RespondSOSRequestInput,
): Promise<SOSRequestWithVolunteer> {
  const accept = input.accept === true;

  if (accept) {
    const rows = await sql`
      UPDATE sos_requests
      SET 
        status = 'accepted',
        volunteer_id = ${volunteerId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId} AND status = 'pending'
      RETURNING id, user_id, latitude, longitude, status, volunteer_id, created_at, updated_at
    `;

    const updatedRequest = rows[0] as SOSRequestRow | undefined;

    if (!updatedRequest) {
      throw new SOSServiceError(404, 'SOS request not found or already accepted.');
    }

    const volunteerRows = await sql`
      SELECT full_name, email
      FROM users
      WHERE id = ${volunteerId}
      LIMIT 1
    `;

    const volunteer = volunteerRows[0] as { full_name: string; email: string } | undefined;

    return {
      ...toSOSRequest(updatedRequest),
      volunteerName: volunteer?.full_name || null,
      volunteerPhone: volunteer?.email || null,
    };
  } else {
    // Record the decline
    await sql`
      INSERT INTO sos_declines (sos_request_id, volunteer_id)
      VALUES (${requestId}, ${volunteerId})
      ON CONFLICT (sos_request_id, volunteer_id) DO NOTHING
    `;

    // Return the original request unchanged
    const rows = await sql`
      SELECT id, user_id, latitude, longitude, status, volunteer_id, created_at, updated_at
      FROM sos_requests
      WHERE id = ${requestId}
      LIMIT 1
    `;

    const request = rows[0] as SOSRequestRow | undefined;

    if (!request) {
      throw new SOSServiceError(404, 'SOS request not found.');
    }

    const volunteerRows = await sql`
      SELECT full_name, email
      FROM users
      WHERE id = ${volunteerId}
      LIMIT 1
    `;

    const volunteer = volunteerRows[0] as { full_name: string; email: string } | undefined;

    return {
      ...toSOSRequest(request),
      volunteerName: volunteer?.full_name || null,
      volunteerPhone: volunteer?.email || null,
    };
  }
}

export async function getUserActiveSOSRequest(userId: number): Promise<SOSRequestWithVolunteer | null> {
  const rows = await sql`
    SELECT 
      sr.id, sr.user_id, sr.latitude, sr.longitude, sr.status, sr.volunteer_id, sr.created_at, sr.updated_at,
      u.full_name as volunteer_name, u.email as volunteer_phone
    FROM sos_requests sr
    LEFT JOIN users u ON sr.volunteer_id = u.id
    WHERE sr.user_id = ${userId} AND sr.status IN ('pending', 'accepted')
    ORDER BY sr.created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return {
    ...toSOSRequest(row as SOSRequestRow),
    volunteerName: row.volunteer_name,
    volunteerPhone: row.volunteer_phone,
  };
}

export async function getVolunteerAcceptedSOSRequest(volunteerId: number): Promise<SOSRequestWithUser | null> {
  const rows = await sql`
    SELECT sr.id, sr.user_id, sr.latitude, sr.longitude, sr.status, sr.volunteer_id, sr.created_at, sr.updated_at,
      u.full_name as user_name, u.location as user_location
    FROM sos_requests sr
    LEFT JOIN users u ON sr.user_id = u.id
    WHERE sr.volunteer_id = ${volunteerId} AND sr.status = 'accepted'
    ORDER BY sr.created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return {
    ...toSOSRequest(row as SOSRequestRow),
    userName: row.user_name,
    userLocation: row.user_location,
  };
}
