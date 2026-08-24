import { sql } from '../config/database.js';
import type { AuthenticatedUser } from '../types/auth.js';
import {
  communityNotificationCategories,
  communityNotificationStatuses,
  type CommunityNotification,
  type CommunityNotificationCategory,
  type CommunityNotificationFieldErrors,
  type CommunityNotificationRow,
  type CommunityNotificationStatus,
  type CreateCommunityNotificationInput,
  type UpdateCommunityNotificationStatusInput,
  type ValidatedCommunityNotificationStatusInput,
  type ValidatedCreateCommunityNotificationInput,
} from '../types/communityNotification.js';

const ACTIVE_NOTIFICATION_STATUS: CommunityNotificationStatus = 'ACTIVE';
const TITLE_MAX_LENGTH = 150;
const AREA_MAX_LENGTH = 150;
let communityNotificationSchemaReady: Promise<void> | null = null;

export class CommunityNotificationServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: CommunityNotificationFieldErrors,
  ) {
    super(message);
    this.name = 'CommunityNotificationServiceError';
  }
}

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatTimestamp(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const timestamp = String(value).trim();

  if (!timestamp) {
    return timestamp;
  }

  const hasTimezone = /(?:z|[+-]\d{2}(?::?\d{2})?)$/i.test(timestamp);
  const normalizedTimestamp = timestamp.replace(' ', 'T');

  if (hasTimezone) {
    return normalizedTimestamp;
  }

  const utcDate = new Date(`${normalizedTimestamp}Z`);

  return Number.isNaN(utcDate.getTime()) ? timestamp : utcDate.toISOString();
}

function optionalTimestamp(value: Date | string | null) {
  return value ? formatTimestamp(value) : null;
}

function canonicalOption<T extends string>(value: string, options: readonly T[]) {
  return options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? null;
}

function normalizeArea(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isAllArea(value: string | null | undefined) {
  return normalizeArea(value) === 'all';
}

function isResidentAreaMatch(targetArea: string, residentLocation: string | null | undefined) {
  const area = normalizeArea(targetArea);
  const location = normalizeArea(residentLocation);

  return Boolean(
    area
    && location
    && (area === location || area.includes(location) || location.includes(area)),
  );
}

function isRelevantToResident(targetArea: string, residentLocation: string | null | undefined) {
  return isAllArea(targetArea) || isResidentAreaMatch(targetArea, residentLocation);
}

function isResidentUser(user: AuthenticatedUser) {
  return String(user.role).toLowerCase() === 'resident';
}

function isAuthorityUser(user: AuthenticatedUser) {
  const role = String(user.role).toLowerCase();

  return role === 'admin' || role === 'authority';
}

function numericNotificationId(notificationId: string) {
  const numericId = Number(notificationId);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new CommunityNotificationServiceError(400, 'Invalid community notification id.');
  }

  return numericId;
}

function effectiveStatus(row: Pick<CommunityNotificationRow, 'expires_at' | 'status'>) {
  const canonicalStatus = canonicalOption(
    trimmedText(row.status),
    communityNotificationStatuses,
  ) ?? ACTIVE_NOTIFICATION_STATUS;
  const expirationTime = row.expires_at ? new Date(formatTimestamp(row.expires_at)).getTime() : null;

  if (
    canonicalStatus === ACTIVE_NOTIFICATION_STATUS
    && expirationTime !== null
    && Number.isFinite(expirationTime)
    && expirationTime <= Date.now()
  ) {
    return 'EXPIRED' as const;
  }

  return canonicalStatus;
}

function toCommunityNotification(row: CommunityNotificationRow): CommunityNotification {
  const category = canonicalOption(trimmedText(row.category), communityNotificationCategories)
    ?? 'PUBLIC_INFORMATION';

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    category,
    targetArea: row.target_area,
    status: effectiveStatus(row),
    createdBy: row.created_by,
    expiresAt: optionalTimestamp(row.expires_at),
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at),
    isRead: Boolean(row.is_read ?? row.read_at),
    readAt: optionalTimestamp(row.read_at ?? null),
    isRelevantToResident: Boolean(row.is_relevant_to_resident),
  };
}

async function createCommunityNotificationSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS community_notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      target_area VARCHAR(150) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_community_notifications_status_created_at
    ON community_notifications(status, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_community_notifications_target_area
    ON community_notifications(target_area)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS community_notification_reads (
      id SERIAL PRIMARY KEY,
      notification_id INTEGER NOT NULL REFERENCES community_notifications(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(notification_id, user_id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_community_notification_reads_notification_id
    ON community_notification_reads(notification_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_community_notification_reads_user_id
    ON community_notification_reads(user_id)
  `;
}

async function ensureCommunityNotificationSchema() {
  communityNotificationSchemaReady ??= createCommunityNotificationSchema();

  await communityNotificationSchemaReady;
}

function validateExpiresAt(value: unknown, fieldErrors: CommunityNotificationFieldErrors) {
  const expiresAtText = trimmedText(value);

  if (!expiresAtText) {
    return null;
  }

  const expirationDate = new Date(expiresAtText);
  const expirationTime = expirationDate.getTime();

  if (!Number.isFinite(expirationTime)) {
    fieldErrors.expiresAt = 'Expiry date/time must be a valid date and time.';
    return null;
  }

  if (expirationTime <= Date.now()) {
    fieldErrors.expiresAt = 'Expiry date/time must be in the future.';
    return null;
  }

  return expirationDate.toISOString();
}

function validateCreateCommunityNotificationInput(
  input: CreateCommunityNotificationInput,
): ValidatedCreateCommunityNotificationInput {
  const fieldErrors: CommunityNotificationFieldErrors = {};
  const title = trimmedText(input.title);
  const message = trimmedText(input.message);
  const targetArea = trimmedText(input.targetArea);
  const categoryText = trimmedText(input.category);
  const category = canonicalOption(categoryText, communityNotificationCategories);

  if (!title) {
    fieldErrors.title = 'Please enter a notification title.';
  } else if (title.length > TITLE_MAX_LENGTH) {
    fieldErrors.title = `Notification title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (!categoryText) {
    fieldErrors.category = 'Please select a notification category.';
  } else if (!category) {
    fieldErrors.category = 'Choose a valid community notification category.';
  }

  if (!targetArea) {
    fieldErrors.targetArea = 'Please enter a target area.';
  } else if (targetArea.length > AREA_MAX_LENGTH) {
    fieldErrors.targetArea = `Target area must be ${AREA_MAX_LENGTH} characters or fewer.`;
  }

  if (!message) {
    fieldErrors.message = 'Please enter the notification message.';
  }

  const expiresAt = validateExpiresAt(input.expiresAt, fieldErrors);

  if (Object.keys(fieldErrors).length > 0 || !category) {
    throw new CommunityNotificationServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    title,
    message,
    category,
    targetArea,
    expiresAt,
  };
}

function validateStatusInput(
  input: UpdateCommunityNotificationStatusInput,
): ValidatedCommunityNotificationStatusInput {
  const fieldErrors: CommunityNotificationFieldErrors = {};
  const statusText = trimmedText(input.status);
  const status = canonicalOption(statusText, communityNotificationStatuses);

  if (!statusText) {
    fieldErrors.status = 'Please select a notification status.';
  } else if (!status) {
    fieldErrors.status = 'Choose Active, Cancelled, or Inactive.';
  }

  if (Object.keys(fieldErrors).length > 0 || !status) {
    throw new CommunityNotificationServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return { status };
}

async function getNotificationRowById(notificationId: number, user: AuthenticatedUser) {
  const rows = await sql`
    SELECT
      community_notifications.id,
      community_notifications.title,
      community_notifications.message,
      community_notifications.category,
      community_notifications.target_area,
      community_notifications.status,
      community_notifications.created_by,
      community_notifications.expires_at,
      community_notifications.created_at,
      community_notifications.updated_at,
      community_notification_reads.read_at,
      community_notification_reads.read_at IS NOT NULL AS is_read,
      FALSE AS is_relevant_to_resident
    FROM community_notifications
    LEFT JOIN community_notification_reads
      ON community_notification_reads.notification_id = community_notifications.id
      AND community_notification_reads.user_id = ${user.id}
    WHERE community_notifications.id = ${notificationId}
    LIMIT 1
  `;

  return (rows as CommunityNotificationRow[])[0] ?? null;
}

export async function createCommunityNotification(
  createdBy: number,
  input: CreateCommunityNotificationInput,
) {
  await ensureCommunityNotificationSchema();
  const notification = validateCreateCommunityNotificationInput(input);

  const rows = await sql`
    INSERT INTO community_notifications (
      title,
      message,
      category,
      target_area,
      status,
      created_by,
      expires_at
    )
    VALUES (
      ${notification.title},
      ${notification.message},
      ${notification.category},
      ${notification.targetArea},
      ${ACTIVE_NOTIFICATION_STATUS},
      ${createdBy},
      ${notification.expiresAt}
    )
    RETURNING id, title, message, category, target_area, status, created_by, expires_at, created_at, updated_at
  `;

  const createdNotification = rows[0] as CommunityNotificationRow | undefined;

  if (!createdNotification) {
    throw new CommunityNotificationServiceError(500, 'Community notification could not be published.');
  }

  return toCommunityNotification({
    ...createdNotification,
    is_read: false,
    read_at: null,
    is_relevant_to_resident: false,
  });
}

export async function listResidentCommunityNotifications(user: AuthenticatedUser) {
  await ensureCommunityNotificationSchema();

  if (!isResidentUser(user)) {
    throw new CommunityNotificationServiceError(403, 'Community notifications are available for resident users only.');
  }

  const location = trimmedText(user.location);

  const rows = await sql`
    WITH resident_context AS (
      SELECT ${location}::text AS resident_location
    )
    SELECT
      community_notifications.id,
      community_notifications.title,
      community_notifications.message,
      community_notifications.category,
      community_notifications.target_area,
      community_notifications.status,
      community_notifications.created_by,
      community_notifications.expires_at,
      community_notifications.created_at,
      community_notifications.updated_at,
      community_notification_reads.read_at,
      community_notification_reads.read_at IS NOT NULL AS is_read,
      (
        LOWER(TRIM(community_notifications.target_area)) = 'all'
        OR (
          resident_context.resident_location <> ''
          AND (
            LOWER(TRIM(community_notifications.target_area)) = LOWER(TRIM(resident_context.resident_location))
            OR LOWER(TRIM(community_notifications.target_area)) LIKE '%' || LOWER(TRIM(resident_context.resident_location)) || '%'
            OR LOWER(TRIM(resident_context.resident_location)) LIKE '%' || LOWER(TRIM(community_notifications.target_area)) || '%'
          )
        )
      ) AS is_relevant_to_resident
    FROM community_notifications
    CROSS JOIN resident_context
    LEFT JOIN community_notification_reads
      ON community_notification_reads.notification_id = community_notifications.id
      AND community_notification_reads.user_id = ${user.id}
    WHERE community_notifications.status = ${ACTIVE_NOTIFICATION_STATUS}
      AND (community_notifications.expires_at IS NULL OR community_notifications.expires_at > CURRENT_TIMESTAMP)
      AND (
        LOWER(TRIM(community_notifications.target_area)) = 'all'
        OR (
          resident_context.resident_location <> ''
          AND (
            LOWER(TRIM(community_notifications.target_area)) = LOWER(TRIM(resident_context.resident_location))
            OR LOWER(TRIM(community_notifications.target_area)) LIKE '%' || LOWER(TRIM(resident_context.resident_location)) || '%'
            OR LOWER(TRIM(resident_context.resident_location)) LIKE '%' || LOWER(TRIM(community_notifications.target_area)) || '%'
          )
        )
      )
    ORDER BY
      community_notification_reads.read_at ASC NULLS FIRST,
      community_notifications.created_at DESC
  `;

  return (rows as CommunityNotificationRow[]).map(toCommunityNotification);
}

export async function listManagedCommunityNotifications(user: AuthenticatedUser) {
  await ensureCommunityNotificationSchema();

  if (!isAuthorityUser(user)) {
    throw new CommunityNotificationServiceError(403, 'You are not authorized to manage community notifications.');
  }

  const rows = await sql`
    SELECT
      id,
      title,
      message,
      category,
      target_area,
      status,
      created_by,
      expires_at,
      created_at,
      updated_at,
      FALSE AS is_read,
      NULL AS read_at,
      FALSE AS is_relevant_to_resident
    FROM community_notifications
    ORDER BY
      CASE
        WHEN status = ${ACTIVE_NOTIFICATION_STATUS}
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        THEN 0
        ELSE 1
      END ASC,
      created_at DESC,
      id DESC
  `;

  return (rows as CommunityNotificationRow[]).map(toCommunityNotification);
}

export async function getCommunityNotificationById(
  notificationId: string,
  user: AuthenticatedUser,
) {
  await ensureCommunityNotificationSchema();
  const numericId = numericNotificationId(notificationId);
  const row = await getNotificationRowById(numericId, user);

  if (!row) {
    throw new CommunityNotificationServiceError(404, 'Community notification not found.');
  }

  if (isAuthorityUser(user)) {
    return toCommunityNotification(row);
  }

  if (!isResidentUser(user)) {
    throw new CommunityNotificationServiceError(403, 'Community notifications are available for resident users only.');
  }

  const notification = toCommunityNotification({
    ...row,
    is_relevant_to_resident: isRelevantToResident(row.target_area, user.location),
  });

  if (
    !notification.isRelevantToResident
    || notification.status !== ACTIVE_NOTIFICATION_STATUS
  ) {
    throw new CommunityNotificationServiceError(404, 'Community notification not found.');
  }

  return notification;
}

export async function markCommunityNotificationRead(
  notificationId: string,
  user: AuthenticatedUser,
) {
  await ensureCommunityNotificationSchema();
  const notification = await getCommunityNotificationById(notificationId, user);

  if (!isResidentUser(user)) {
    throw new CommunityNotificationServiceError(403, 'Only resident accounts can mark notifications as read.');
  }

  await sql`
    INSERT INTO community_notification_reads (notification_id, user_id)
    VALUES (${notification.id}, ${user.id})
    ON CONFLICT (notification_id, user_id) DO NOTHING
  `;

  return getCommunityNotificationById(String(notification.id), user);
}

export async function updateCommunityNotificationStatus(
  notificationId: string,
  input: UpdateCommunityNotificationStatusInput,
  user: AuthenticatedUser,
) {
  await ensureCommunityNotificationSchema();

  if (!isAuthorityUser(user)) {
    throw new CommunityNotificationServiceError(403, 'You are not authorized to manage community notifications.');
  }

  const numericId = numericNotificationId(notificationId);
  const { status } = validateStatusInput(input);

  const rows = await sql`
    UPDATE community_notifications
    SET status = ${status},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${numericId}
    RETURNING id, title, message, category, target_area, status, created_by, expires_at, created_at, updated_at
  `;

  const updatedNotification = rows[0] as CommunityNotificationRow | undefined;

  if (!updatedNotification) {
    throw new CommunityNotificationServiceError(404, 'Community notification not found.');
  }

  return toCommunityNotification({
    ...updatedNotification,
    is_read: false,
    read_at: null,
    is_relevant_to_resident: false,
  });
}
