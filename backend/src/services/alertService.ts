import { sql } from '../config/database.js';
import {
  alertAuditActions,
  alertDisasterTypes,
  alertRiskLevels,
  alertStatuses,
  type Alert,
  type AlertAuditAction,
  type AlertAuditEvent,
  type AlertAuditRow,
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
let auditTableReady: Promise<void> | null = null;

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

type RecordAlertAuditEventInput = {
  action: AlertAuditAction;
  alertId: number;
  changedBy: number | null;
  newRiskLevel: string | null;
  newStatus: string | null;
  previousRiskLevel: string | null;
  previousStatus: string | null;
};

async function createAlertAuditTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS alert_audit_events (
      id SERIAL PRIMARY KEY,
      alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
      action VARCHAR(20) NOT NULL,
      previous_status VARCHAR(20),
      new_status VARCHAR(20),
      previous_risk_level VARCHAR(20),
      new_risk_level VARCHAR(20),
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_alert_audit_events_alert_id
    ON alert_audit_events(alert_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_alert_audit_events_created_at
    ON alert_audit_events(created_at DESC)
  `;
}

async function ensureAlertAuditTable() {
  auditTableReady ??= createAlertAuditTable();

  await auditTableReady;
}

function toAuditEvent(row: AlertAuditRow): AlertAuditEvent {
  return {
    id: row.id,
    alertId: row.alert_id,
    action: row.action,
    title: row.title,
    disasterType: row.disaster_type,
    affectedArea: row.affected_area,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    previousRiskLevel: row.previous_risk_level,
    newRiskLevel: row.new_risk_level,
    changedBy: row.changed_by,
    createdAt: formatTimestamp(row.created_at),
  };
}

function statusText(row: AlertRow) {
  return effectiveAlertStatus(row.status, row.expires_at);
}

function riskLevelText(row: AlertRow) {
  return trimmedText(row.risk_level) || null;
}

function auditActionForUpdate(
  previousAlert: AlertRow,
  updatedAlert: AlertRow,
  requestedAction: AlertAuditAction | null,
): AlertAuditAction {
  if (requestedAction) {
    return requestedAction;
  }

  const previousStatus = statusText(previousAlert);
  const newStatus = statusText(updatedAlert);

  if (previousStatus !== newStatus && newStatus === 'Expired') {
    return 'EXPIRED';
  }

  if (previousStatus !== newStatus && newStatus === 'Resolved') {
    return 'RESOLVED';
  }

  return 'UPDATED';
}

async function recordAlertAuditEvent({
  action,
  alertId,
  changedBy,
  newRiskLevel,
  newStatus,
  previousRiskLevel,
  previousStatus,
}: RecordAlertAuditEventInput) {
  await ensureAlertAuditTable();

  await sql`
    INSERT INTO alert_audit_events (
      alert_id,
      action,
      previous_status,
      new_status,
      previous_risk_level,
      new_risk_level,
      changed_by
    )
    VALUES (
      ${alertId},
      ${action},
      ${previousStatus},
      ${newStatus},
      ${previousRiskLevel},
      ${newRiskLevel},
      ${changedBy}
    )
  `;
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
  await ensureAlertAuditTable();

  const rows = await sql`
    SELECT
      alert_audit_events.id,
      alert_audit_events.alert_id,
      alert_audit_events.action,
      alert_audit_events.previous_status,
      alert_audit_events.new_status,
      alert_audit_events.previous_risk_level,
      alert_audit_events.new_risk_level,
      alert_audit_events.changed_by,
      alert_audit_events.created_at,
      alerts.title,
      alerts.disaster_type,
      alerts.affected_area
    FROM alert_audit_events
    INNER JOIN alerts ON alerts.id = alert_audit_events.alert_id
    ORDER BY
      alert_audit_events.created_at DESC,
      alert_audit_events.id DESC
  `;

  return (rows as AlertAuditRow[]).map(toAuditEvent);
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

  await recordAlertAuditEvent({
    action: 'PUBLISHED',
    alertId: createdAlert.id,
    changedBy: senderId,
    newRiskLevel: riskLevelText(createdAlert),
    newStatus: statusText(createdAlert),
    previousRiskLevel: null,
    previousStatus: null,
  });

  return toAlert(createdAlert);
}

export async function updateAlert(alertId: string, input: UpdateAlertInput, changedBy: number | null = null) {
  const numericId = numericAlertId(alertId);
  const alert = validateUpdateAlertInput(input);
  const auditActionOverride = canonicalOption(trimmedText(input.auditAction), alertAuditActions);
  const requestedAuditAction = auditActionOverride === 'PUBLISHED' ? null : auditActionOverride;

  const currentRows = await sql`
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

  const previousAlert = currentRows[0] as AlertRow | undefined;

  if (!previousAlert) {
    throw new AlertServiceError(404, 'Emergency alert not found.');
  }

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

  await recordAlertAuditEvent({
    action: auditActionForUpdate(previousAlert, updatedAlert, requestedAuditAction),
    alertId: updatedAlert.id,
    changedBy,
    newRiskLevel: riskLevelText(updatedAlert),
    newStatus: statusText(updatedAlert),
    previousRiskLevel: riskLevelText(previousAlert),
    previousStatus: statusText(previousAlert),
  });

  return toAlert(updatedAlert);
}
