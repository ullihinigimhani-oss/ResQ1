import { sql } from '../config/database.js';
import { AlertServiceError } from './alertService.js';
import type { PreferredLanguage } from '../types/auth.js';
import type {
  AlertPreferenceRow,
  AlertPreferences,
  UpdateAlertPreferencesInput,
} from '../types/alertPreference.js';

const preferredLanguages = ['English', 'Sinhala', 'Tamil'] as const satisfies readonly PreferredLanguage[];
const supportedAlertSounds = ['default'] as const;
const DEFAULT_QUIET_HOURS_START = '22:00';
const DEFAULT_QUIET_HOURS_END = '06:00';
let preferencesSchemaReady: Promise<void> | null = null;

function formatTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toPreferredLanguage(value: unknown, fallback: PreferredLanguage = 'English'): PreferredLanguage {
  return preferredLanguages.includes(value as PreferredLanguage) ? (value as PreferredLanguage) : fallback;
}

function preferredLanguageOrNull(value: unknown): PreferredLanguage | null {
  return preferredLanguages.includes(value as PreferredLanguage) ? (value as PreferredLanguage) : null;
}

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTime(value: unknown, fallback: string) {
  if (value instanceof Date) {
    const hours = String(value.getUTCHours()).padStart(2, '0');
    const minutes = String(value.getUTCMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  const text = trimmedText(value);
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(text);

  if (!match) {
    return fallback;
  }

  return `${match[1]}:${match[2]}`;
}

function validateTime(value: unknown, fieldName: string, fieldErrors: Record<string, string>) {
  const text = trimmedText(value);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);

  if (!match) {
    fieldErrors[fieldName] = 'Time must use HH:mm format.';
    return fieldName === 'quietHoursStart' ? DEFAULT_QUIET_HOURS_START : DEFAULT_QUIET_HOURS_END;
  }

  return `${match[1]}:${match[2]}`;
}

function validateAlertSound(value: unknown, fieldErrors: Record<string, string>) {
  const text = trimmedText(value) || 'default';

  if (!supportedAlertSounds.includes(text as (typeof supportedAlertSounds)[number])) {
    fieldErrors.alertSound = 'Choose a supported alert sound.';
    return 'default';
  }

  return text;
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);

  return hours * 60 + minutes;
}

export function isTimeWithinQuietHours(currentTime: string, quietHoursStart: string, quietHoursEnd: string) {
  const current = minutesFromTime(normalizeTime(currentTime, '00:00'));
  const start = minutesFromTime(normalizeTime(quietHoursStart, DEFAULT_QUIET_HOURS_START));
  const end = minutesFromTime(normalizeTime(quietHoursEnd, DEFAULT_QUIET_HOURS_END));

  if (start === end) {
    return false;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

async function ensureAlertPreferencesSchema() {
  preferencesSchemaReady ??= (async () => {
    await sql`ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS alert_sound VARCHAR(50) DEFAULT 'default'`;
    await sql`ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS vibration_enabled BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00'`;
    await sql`ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '06:00'`;
  })();

  await preferencesSchemaReady;
}

function toPreferences(row: AlertPreferenceRow): AlertPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    generalNotifications: row.general_notifications ?? true,
    pushNotifications: row.push_notifications ?? true,
    locationAlerts: row.location_alerts ?? true,
    schoolAlerts: row.school_alerts ?? true,
    soundEnabled: row.sound_enabled ?? true,
    alertSound: validateAlertSound(row.alert_sound, {}),
    vibrationEnabled: row.vibration_enabled ?? true,
    quietHoursEnabled: row.quiet_hours_enabled ?? false,
    quietHoursStart: normalizeTime(row.quiet_hours_start, DEFAULT_QUIET_HOURS_START),
    quietHoursEnd: normalizeTime(row.quiet_hours_end, DEFAULT_QUIET_HOURS_END),
    preferredLanguage: toPreferredLanguage(row.preferred_language),
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function booleanPreference(value: unknown, fieldName: string, fieldErrors: Record<string, string>) {
  if (typeof value === 'boolean') {
    return value;
  }

  fieldErrors[fieldName] = 'Preference value must be true or false.';
  return false;
}

function validatePreferences(input: UpdateAlertPreferencesInput) {
  const fieldErrors: Record<string, string> = {};
  const preferredLanguage = preferredLanguageOrNull(input.preferredLanguage);

  if (!preferredLanguage) {
    fieldErrors.preferredLanguage = 'Choose English, Sinhala, or Tamil.';
  }

  const preferences = {
    generalNotifications: booleanPreference(input.generalNotifications, 'generalNotifications', fieldErrors),
    pushNotifications: booleanPreference(input.pushNotifications, 'pushNotifications', fieldErrors),
    locationAlerts: booleanPreference(input.locationAlerts, 'locationAlerts', fieldErrors),
    schoolAlerts: booleanPreference(input.schoolAlerts, 'schoolAlerts', fieldErrors),
    soundEnabled: booleanPreference(input.soundEnabled, 'soundEnabled', fieldErrors),
    alertSound: validateAlertSound(input.alertSound, fieldErrors),
    vibrationEnabled: booleanPreference(input.vibrationEnabled, 'vibrationEnabled', fieldErrors),
    quietHoursEnabled: booleanPreference(input.quietHoursEnabled, 'quietHoursEnabled', fieldErrors),
    quietHoursStart: validateTime(input.quietHoursStart, 'quietHoursStart', fieldErrors),
    quietHoursEnd: validateTime(input.quietHoursEnd, 'quietHoursEnd', fieldErrors),
    preferredLanguage: preferredLanguage ?? 'English',
  };

  if (Object.keys(fieldErrors).length > 0) {
    throw new AlertServiceError(400, 'Please correct the highlighted preferences.', fieldErrors);
  }

  return preferences;
}

export async function getAlertPreferencesForUser(
  userId: number,
  fallbackLanguage: string | null | undefined,
) {
  await ensureAlertPreferencesSchema();

  const preferredLanguage = toPreferredLanguage(fallbackLanguage);
  const rows = await sql`
    INSERT INTO alert_preferences (user_id, preferred_language)
    VALUES (${userId}, ${preferredLanguage})
    ON CONFLICT (user_id) DO NOTHING
    RETURNING
      id,
      user_id,
      general_notifications,
      push_notifications,
      location_alerts,
      school_alerts,
      sound_enabled,
      alert_sound,
      vibration_enabled,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      preferred_language,
      updated_at
  `;

  const insertedPreference = rows[0] as AlertPreferenceRow | undefined;

  if (insertedPreference) {
    return toPreferences(insertedPreference);
  }

  const existingRows = await sql`
    SELECT
      id,
      user_id,
      general_notifications,
      push_notifications,
      location_alerts,
      school_alerts,
      sound_enabled,
      alert_sound,
      vibration_enabled,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      preferred_language,
      updated_at
    FROM alert_preferences
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const existingPreference = existingRows[0] as AlertPreferenceRow | undefined;

  if (!existingPreference) {
    throw new AlertServiceError(500, 'Alert preferences could not be loaded.');
  }

  return toPreferences(existingPreference);
}

export async function updateAlertPreferencesForUser(
  userId: number,
  input: UpdateAlertPreferencesInput,
) {
  await ensureAlertPreferencesSchema();

  const preferences = validatePreferences(input);
  const rows = await sql`
    INSERT INTO alert_preferences (
      user_id,
      general_notifications,
      push_notifications,
      location_alerts,
      school_alerts,
      sound_enabled,
      alert_sound,
      vibration_enabled,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      preferred_language,
      updated_at
    )
    VALUES (
      ${userId},
      ${preferences.generalNotifications},
      ${preferences.pushNotifications},
      ${preferences.locationAlerts},
      ${preferences.schoolAlerts},
      ${preferences.soundEnabled},
      ${preferences.alertSound},
      ${preferences.vibrationEnabled},
      ${preferences.quietHoursEnabled},
      ${preferences.quietHoursStart},
      ${preferences.quietHoursEnd},
      ${preferences.preferredLanguage},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE
    SET general_notifications = EXCLUDED.general_notifications,
        push_notifications = EXCLUDED.push_notifications,
        location_alerts = EXCLUDED.location_alerts,
        school_alerts = EXCLUDED.school_alerts,
        sound_enabled = EXCLUDED.sound_enabled,
        alert_sound = EXCLUDED.alert_sound,
        vibration_enabled = EXCLUDED.vibration_enabled,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        preferred_language = EXCLUDED.preferred_language,
        updated_at = CURRENT_TIMESTAMP
    RETURNING
      id,
      user_id,
      general_notifications,
      push_notifications,
      location_alerts,
      school_alerts,
      sound_enabled,
      alert_sound,
      vibration_enabled,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      preferred_language,
      updated_at
  `;

  const savedPreference = rows[0] as AlertPreferenceRow | undefined;

  if (!savedPreference) {
    throw new AlertServiceError(500, 'Alert preferences could not be saved.');
  }

  await sql`
    UPDATE users
    SET preferred_language = ${preferences.preferredLanguage},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;

  return toPreferences(savedPreference);
}
