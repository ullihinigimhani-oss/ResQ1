import { sql } from '../config/database.js';
import {
  alertAreaLabels,
  type AlertAreaLabel,
  type AlertAreaSubscription,
  type AlertAreaSubscriptionFieldErrors,
  type AlertAreaSubscriptionRow,
  type CreateAlertAreaSubscriptionInput,
} from '../types/alertAreaSubscription.js';

export class AlertAreaSubscriptionServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: AlertAreaSubscriptionFieldErrors,
  ) {
    super(message);
    this.name = 'AlertAreaSubscriptionServiceError';
  }
}

let alertSubscriptionSchemaReady: Promise<void> | null = null;

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalLabel(value: unknown): AlertAreaLabel | null {
  const normalizedValue = trimmedText(value).toLowerCase();

  return alertAreaLabels.find((label) => label.toLowerCase() === normalizedValue) ?? null;
}

function formatTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toAlertAreaSubscription(row: AlertAreaSubscriptionRow): AlertAreaSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    areaName: row.area_name,
    label: canonicalLabel(row.area_type) ?? 'Other',
    createdAt: formatTimestamp(row.created_at),
  };
}

export async function ensureAlertSubscriptionSchema() {
  alertSubscriptionSchemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS alert_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        area_name VARCHAR(150) NOT NULL,
        area_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user_id
      ON alert_subscriptions(user_id)
    `;
  })();

  await alertSubscriptionSchemaReady;
}

export async function listAlertAreaSubscriptions(userId: number) {
  await ensureAlertSubscriptionSchema();

  const rows = await sql`
    SELECT id, user_id, area_name, area_type, created_at
    FROM alert_subscriptions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC, area_name ASC
  `;

  return (rows as AlertAreaSubscriptionRow[]).map(toAlertAreaSubscription);
}

export async function listAvailableAlertAreas(residentLocation: string | null | undefined) {
  await ensureAlertSubscriptionSchema();

  const location = trimmedText(residentLocation);
  const rows = await sql`
    WITH available_areas AS (
      SELECT ${location}::text AS area_name
      UNION
      SELECT TRIM(alerts.affected_area) AS area_name
      FROM alerts
      WHERE TRIM(COALESCE(alerts.affected_area, '')) <> ''
      UNION
      SELECT TRIM(schools.area) AS area_name
      FROM schools
      WHERE TRIM(COALESCE(schools.area, '')) <> ''
    )
    SELECT area_name
    FROM available_areas
    WHERE TRIM(COALESCE(area_name, '')) <> ''
    ORDER BY LOWER(area_name) ASC
  `;

  return rows.map((row) => String(row.area_name));
}

export async function createAlertAreaSubscription(
  userId: number,
  input: CreateAlertAreaSubscriptionInput,
) {
  await ensureAlertSubscriptionSchema();

  const areaName = trimmedText(input.areaName);
  const label = canonicalLabel(input.label);
  const fieldErrors: AlertAreaSubscriptionFieldErrors = {};

  if (!areaName) {
    fieldErrors.areaName = 'Area or location is required.';
  } else if (areaName.length > 150) {
    fieldErrors.areaName = 'Area or location must be 150 characters or fewer.';
  }

  if (!label) {
    fieldErrors.label = 'Choose Home, School, Family, or Other.';
  }

  if (!areaName || !label || Object.keys(fieldErrors).length > 0) {
    throw new AlertAreaSubscriptionServiceError(
      400,
      'Please correct the highlighted fields.',
      fieldErrors,
    );
  }

  const existingRows = await sql`
    SELECT id
    FROM alert_subscriptions
    WHERE user_id = ${userId}
      AND LOWER(TRIM(area_name)) = LOWER(TRIM(${areaName}))
    LIMIT 1
  `;

  if (existingRows[0]) {
    throw new AlertAreaSubscriptionServiceError(
      409,
      'You are already subscribed to this area.',
      { areaName: 'You are already subscribed to this area.' },
    );
  }

  const rows = await sql`
    INSERT INTO alert_subscriptions (user_id, area_name, area_type)
    SELECT ${userId}, ${areaName}, ${label}
    WHERE NOT EXISTS (
      SELECT 1
      FROM alert_subscriptions
      WHERE user_id = ${userId}
        AND LOWER(TRIM(area_name)) = LOWER(TRIM(${areaName}))
    )
    RETURNING id, user_id, area_name, area_type, created_at
  `;

  const created = rows[0] as AlertAreaSubscriptionRow | undefined;

  if (!created) {
    throw new AlertAreaSubscriptionServiceError(
      409,
      'You are already subscribed to this area.',
      { areaName: 'You are already subscribed to this area.' },
    );
  }

  return toAlertAreaSubscription(created);
}

export async function removeAlertAreaSubscription(userId: number, subscriptionId: number) {
  await ensureAlertSubscriptionSchema();

  const rows = await sql`
    DELETE FROM alert_subscriptions
    WHERE id = ${subscriptionId}
      AND user_id = ${userId}
    RETURNING id
  `;

  if (!rows[0]) {
    throw new AlertAreaSubscriptionServiceError(404, 'Alert area subscription not found.');
  }
}
