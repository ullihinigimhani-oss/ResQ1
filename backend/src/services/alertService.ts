import { sql } from '../config/database.js';
import {
  alertDisasterTypes,
  alertRiskLevels,
  alertStatuses,
  type Alert,
  type AlertDisasterType,
  type AlertRiskLevel,
  type AlertRow,
  type AlertStatus,
  type CreateAlertInput,
  type UpdateAlertInput,
  type ValidatedCreateAlertInput,
  type ValidatedUpdateAlertInput,
} from '../types/alert.js';

const ACTIVE_ALERT_STATUS: AlertStatus = 'Active';
const ALERT_TITLE_MAX_LENGTH = 150;
const ALERT_AREA_MAX_LENGTH = 150;

export class AlertServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AlertServiceError';
  }
}

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function optionalTimestamp(value: Date | string | null) {
  return value ? formatTimestamp(value) : null;
}

function canonicalOption<T extends string>(value: string, options: readonly T[]) {
  return options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? null;
}

function effectiveAlertStatus(status: AlertRow['status'], expiresAt: AlertRow['expires_at']): AlertStatus {
  const canonicalStatus = canonicalOption(trimmedText(status), alertStatuses) ?? ACTIVE_ALERT_STATUS;
  const expirationTime = expiresAt ? new Date(formatTimestamp(expiresAt)).getTime() : null;

  if (
    canonicalStatus === ACTIVE_ALERT_STATUS &&
    expirationTime !== null &&
    Number.isFinite(expirationTime) &&
    expirationTime <= Date.now()
  ) {
    return 'Expired';
  }

  return canonicalStatus;
}

function toAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    title: row.title,
    disasterType: row.disaster_type,
    affectedArea: row.affected_area,
    riskLevel: row.risk_level,
    message: row.message,
    safetyInstructions: row.safety_instructions ?? '',
    status: effectiveAlertStatus(row.status, row.expires_at),
    expiresAt: optionalTimestamp(row.expires_at),
    createdBy: row.created_by,
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at),
    isRelevantToResident: Boolean(row.is_relevant_to_resident),
  };
}

function numericAlertId(alertId: string) {
  const numericValue = Number(alertId);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new AlertServiceError(400, 'Invalid alert id.');
  }

  return numericValue;
}

function validateExpiresAt(value: unknown, fieldErrors: Record<string, string>) {
  const expiresAt = trimmedText(value);

  if (!expiresAt) {
    return null;
  }

  const expirationDate = new Date(expiresAt);
  const expirationTime = expirationDate.getTime();

  if (!Number.isFinite(expirationTime)) {
    fieldErrors.expiresAt = 'Expiration time must be a valid date and time.';
    return null;
  }

  if (expirationTime <= Date.now()) {
    fieldErrors.expiresAt = 'Expiration time must be in the future.';
    return null;
  }

  return expirationDate.toISOString();
}

function validateAlertFields(
  input: CreateAlertInput,
  fieldErrors: Record<string, string>,
): ValidatedCreateAlertInput | null {
  const title = trimmedText(input.title);
  const disasterTypeText = trimmedText(input.disasterType) || 'Flood';
  const affectedArea = trimmedText(input.affectedArea);
  const riskLevelText = trimmedText(input.riskLevel);
  const message = trimmedText(input.message);
  const safetyInstructions = trimmedText(input.safetyInstructions);

  if (!title) {
    fieldErrors.title = 'Please enter an alert title.';
  } else if (title.length > ALERT_TITLE_MAX_LENGTH) {
    fieldErrors.title = `Alert title must be ${ALERT_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  const disasterType = canonicalOption(disasterTypeText, alertDisasterTypes);

  if (!disasterType) {
    fieldErrors.disasterType = 'Disaster type must be Flood.';
  }

  if (!affectedArea) {
    fieldErrors.affectedArea = 'Please enter the affected area.';
  } else if (affectedArea.length > ALERT_AREA_MAX_LENGTH) {
    fieldErrors.affectedArea = `Affected area must be ${ALERT_AREA_MAX_LENGTH} characters or fewer.`;
  }

  const riskLevel = canonicalOption(riskLevelText, alertRiskLevels);

  if (!riskLevelText) {
    fieldErrors.riskLevel = 'Please select a risk level.';
  } else if (!riskLevel) {
    fieldErrors.riskLevel = 'Choose Low, Moderate, High, or Critical.';
  }

  if (!message) {
    fieldErrors.message = 'Please enter the warning message.';
  }

  if (!safetyInstructions) {
    fieldErrors.safetyInstructions = 'Please provide safety instructions.';
  }

  const expiresAt = validateExpiresAt(input.expiresAt, fieldErrors);

  if (Object.keys(fieldErrors).length > 0 || !disasterType || !riskLevel) {
    return null;
  }

  return {
    title,
    disasterType,
    affectedArea,
    riskLevel,
    message,
    safetyInstructions,
    expiresAt,
  };
}

function validateCreateAlertInput(input: CreateAlertInput): ValidatedCreateAlertInput {
  const fieldErrors: Record<string, string> = {};
  const alert = validateAlertFields(input, fieldErrors);

  if (!alert) {
    throw new AlertServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return alert;
}

function validateUpdateAlertInput(input: UpdateAlertInput): ValidatedUpdateAlertInput {
  const fieldErrors: Record<string, string> = {};
  const alert = validateAlertFields(input, fieldErrors);
  const statusText = trimmedText(input.status);
  const status = canonicalOption(statusText, alertStatuses);

  if (!statusText) {
    fieldErrors.status = 'Please select an alert status.';
  } else if (!status) {
    fieldErrors.status = 'Choose Active, Expired, or Resolved.';
  }

  if (!alert || !status) {
    throw new AlertServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    ...alert,
    status,
  };
}

export async function getActiveAlerts(residentLocation: string | null | undefined) {
  const location = trimmedText(residentLocation);

  const rows = await sql`
    WITH resident_context AS (
      SELECT ${location}::text AS resident_location
    )
    SELECT
      alerts.id,
      alerts.title,
      alerts.disaster_type,
      alerts.affected_area,
      alerts.risk_level,
      alerts.message,
      alerts.safety_instructions,
      alerts.status,
      alerts.expires_at,
      alerts.created_by,
      alerts.created_at,
      alerts.updated_at,
      (
        resident_context.resident_location <> ''
        AND (
          LOWER(alerts.affected_area) = LOWER(resident_context.resident_location)
          OR LOWER(alerts.affected_area) LIKE '%' || LOWER(resident_context.resident_location) || '%'
          OR LOWER(resident_context.resident_location) LIKE '%' || LOWER(alerts.affected_area) || '%'
        )
      ) AS is_relevant_to_resident
    FROM alerts
    CROSS JOIN resident_context
    WHERE alerts.status = ${ACTIVE_ALERT_STATUS}
      AND (alerts.expires_at IS NULL OR alerts.expires_at > CURRENT_TIMESTAMP)
    ORDER BY
      CASE
        WHEN (
          resident_context.resident_location <> ''
          AND (
            LOWER(alerts.affected_area) = LOWER(resident_context.resident_location)
            OR LOWER(alerts.affected_area) LIKE '%' || LOWER(resident_context.resident_location) || '%'
            OR LOWER(resident_context.resident_location) LIKE '%' || LOWER(alerts.affected_area) || '%'
          )
        )
        THEN 0
        ELSE 1
      END ASC,
      CASE alerts.risk_level
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Moderate' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
      END ASC,
      alerts.created_at DESC
  `;

  return (rows as AlertRow[]).map(toAlert);
}

export async function getAlertHistory() {
  const rows = await sql`
    SELECT
      id,
      title,
      disaster_type,
      affected_area,
      risk_level,
      message,
      safety_instructions,
      status,
      expires_at,
      created_by,
      created_at,
      updated_at,
      FALSE AS is_relevant_to_resident
    FROM alerts
    WHERE COALESCE(status, ${ACTIVE_ALERT_STATUS}) <> ${ACTIVE_ALERT_STATUS}
      OR (expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP)
    ORDER BY
      updated_at DESC,
      created_at DESC
  `;

  return (rows as AlertRow[]).map(toAlert);
}

export async function getAlertById(alertId: string) {
  const numericId = numericAlertId(alertId);

  const rows = await sql`
    SELECT
      id,
      title,
      disaster_type,
      affected_area,
      risk_level,
      message,
      safety_instructions,
      status,
      expires_at,
      created_by,
      created_at,
      updated_at,
      FALSE AS is_relevant_to_resident
    FROM alerts
    WHERE id = ${numericId}
    LIMIT 1
  `;

  const alert = rows[0] as AlertRow | undefined;

  if (!alert) {
    throw new AlertServiceError(404, 'Emergency alert not found.');
  }

  return toAlert(alert);
}

export async function createAlert(senderId: number, input: CreateAlertInput) {
  const alert = validateCreateAlertInput(input);

  const rows = await sql`
    INSERT INTO alerts (
      title,
      disaster_type,
      affected_area,
      risk_level,
      message,
      safety_instructions,
      status,
      expires_at,
      created_by
    )
    VALUES (
      ${alert.title},
      ${alert.disasterType},
      ${alert.affectedArea},
      ${alert.riskLevel},
      ${alert.message},
      ${alert.safetyInstructions},
      ${ACTIVE_ALERT_STATUS},
      ${alert.expiresAt},
      ${senderId}
    )
    RETURNING id, title, disaster_type, affected_area, risk_level, message, safety_instructions, status, expires_at, created_by, created_at, updated_at
  `;

  const createdAlert = rows[0] as AlertRow | undefined;

  if (!createdAlert) {
    throw new AlertServiceError(500, 'Emergency alert could not be published.');
  }

  return toAlert(createdAlert);
}

export async function updateAlert(alertId: string, input: UpdateAlertInput) {
  const numericId = numericAlertId(alertId);
  const alert = validateUpdateAlertInput(input);

  const rows = await sql`
    UPDATE alerts
    SET title = ${alert.title},
        disaster_type = ${alert.disasterType},
        affected_area = ${alert.affectedArea},
        risk_level = ${alert.riskLevel},
        message = ${alert.message},
        safety_instructions = ${alert.safetyInstructions},
        status = ${alert.status},
        expires_at = ${alert.expiresAt},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${numericId}
    RETURNING id, title, disaster_type, affected_area, risk_level, message, safety_instructions, status, expires_at, created_by, created_at, updated_at
  `;

  const updatedAlert = rows[0] as AlertRow | undefined;

  if (!updatedAlert) {
    throw new AlertServiceError(404, 'Emergency alert not found.');
  }

  return toAlert(updatedAlert);
}
