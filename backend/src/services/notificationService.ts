import { sql } from '../config/database.js';
import { AlertServiceError } from './alertService.js';
import type { Alert } from '../types/alert.js';

type RegisterPushTokenInput = {
  deviceName?: unknown;
  expoPushToken?: unknown;
  platform?: unknown;
};

type PushRecipientRow = {
  user_id: number;
  location: string | null;
  expo_push_token: string;
  general_notifications: boolean | null;
  push_notifications: boolean | null;
  location_alerts: boolean | null;
  school_alerts: boolean | null;
  sound_enabled: boolean | null;
  alert_sound: string | null;
  vibration_enabled: boolean | null;
  quiet_hours_enabled: boolean | null;
  quiet_hours_start: Date | string | null;
  quiet_hours_end: Date | string | null;
};

type ExpoPushMessage = {
  body: string;
  channelId?: string;
  data: Record<string, unknown>;
  priority?: 'default' | 'high' | 'normal';
  sound?: 'default';
  title: string;
  to: string;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const ALERT_CHANNELS = {
  critical: 'resq1-critical-alerts',
  default: 'resq1-alerts-default',
  silent: 'resq1-alerts-silent',
  soundOnly: 'resq1-alerts-sound-only',
  vibrateOnly: 'resq1-alerts-vibrate-only',
} as const;
const DEFAULT_QUIET_HOURS_START = '22:00';
const DEFAULT_QUIET_HOURS_END = '06:00';
const supportedAlertSounds = ['default'] as const;
let pushTokenTableReady: Promise<void> | null = null;

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTime(value: unknown, fallback: string) {
  if (value instanceof Date) {
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  const text = trimmedText(value);
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(text);

  if (!match) {
    return fallback;
  }

  return `${match[1]}:${match[2]}`;
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);

  return hours * 60 + minutes;
}

function currentServerTimeText() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function isTimeWithinQuietHours(currentTime: string, quietHoursStart: string, quietHoursEnd: string) {
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

function isExpoPushToken(value: string) {
  return /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/.test(value);
}

function isResidentAreaMatch(alertArea: string, residentLocation: string | null) {
  const area = alertArea.trim().toLowerCase();
  const location = residentLocation?.trim().toLowerCase();

  return Boolean(
    area &&
    location &&
    (area === location || area.includes(location) || location.includes(area)),
  );
}

function isCriticalAlert(alert: Alert) {
  return String(alert.riskLevel).toLowerCase() === 'critical';
}

function supportedSound(value: string | null) {
  return supportedAlertSounds.includes(value as (typeof supportedAlertSounds)[number])
    ? (value as (typeof supportedAlertSounds)[number])
    : 'default';
}

function notificationBody(alert: Alert) {
  const area = alert.affectedArea ? ` for ${alert.affectedArea}` : '';

  return `${alert.riskLevel} ${alert.disasterType} alert${area}. Open ResQ1 for safety details.`;
}

async function ensurePushTokenTable() {
  pushTokenTableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS alert_push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expo_push_token TEXT UNIQUE NOT NULL,
        platform VARCHAR(20),
        device_name VARCHAR(150),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alert_push_tokens_user_id
      ON alert_push_tokens(user_id)
    `;
  })();

  await pushTokenTableReady;
}

function shouldNotifyRecipient(alert: Alert, recipient: PushRecipientRow) {
  const critical = isCriticalAlert(alert);
  const areaMatched = isResidentAreaMatch(alert.affectedArea, recipient.location);

  if (alert.alertAudience === 'SCHOOL_EMERGENCY' && !(recipient.school_alerts ?? true)) {
    return false;
  }

  if (critical) {
    return areaMatched;
  }

  if (!(recipient.general_notifications ?? true) || !(recipient.push_notifications ?? true)) {
    return false;
  }

  if (!areaMatched) {
    return false;
  }

  if (!(recipient.location_alerts ?? true)) {
    return false;
  }

  if (recipient.quiet_hours_enabled ?? false) {
    const quietHoursStart = normalizeTime(recipient.quiet_hours_start, DEFAULT_QUIET_HOURS_START);
    const quietHoursEnd = normalizeTime(recipient.quiet_hours_end, DEFAULT_QUIET_HOURS_END);

    if (isTimeWithinQuietHours(currentServerTimeText(), quietHoursStart, quietHoursEnd)) {
      return false;
    }
  }

  return true;
}

function toExpoPushMessage(alert: Alert, recipient: PushRecipientRow): ExpoPushMessage {
  const critical = isCriticalAlert(alert);
  const soundEnabled = critical || (recipient.sound_enabled ?? true);
  const vibrationEnabled = critical || (recipient.vibration_enabled ?? true);
  const selectedSound = supportedSound(recipient.alert_sound);
  const channelId = critical
    ? ALERT_CHANNELS.critical
    : soundEnabled && vibrationEnabled
      ? ALERT_CHANNELS.default
      : soundEnabled
        ? ALERT_CHANNELS.soundOnly
        : vibrationEnabled
          ? ALERT_CHANNELS.vibrateOnly
          : ALERT_CHANNELS.silent;

  return {
    to: recipient.expo_push_token,
    title: critical ? 'Critical Emergency Alert' : 'Emergency Alert',
    body: notificationBody(alert),
    channelId,
    ...(soundEnabled && selectedSound === 'default' ? { sound: 'default' as const } : {}),
    priority: 'high',
    data: {
      alertId: alert.id,
      affectedArea: alert.affectedArea,
      alertAudience: alert.alertAudience,
      disasterType: alert.disasterType,
      riskLevel: alert.riskLevel,
      critical,
      soundEnabled,
      status: alert.status,
      vibrationEnabled,
    },
  };
}

async function deactivatePushToken(expoPushToken: string) {
  await sql`
    UPDATE alert_push_tokens
    SET active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE expo_push_token = ${expoPushToken}
  `;
}

export async function registerResidentPushToken(userId: number, input: RegisterPushTokenInput) {
  await ensurePushTokenTable();

  const expoPushToken = trimmedText(input.expoPushToken);

  if (!isExpoPushToken(expoPushToken)) {
    throw new AlertServiceError(400, 'A valid Expo push token is required.');
  }

  const platform = trimmedText(input.platform).slice(0, 20) || null;
  const deviceName = trimmedText(input.deviceName).slice(0, 150) || null;

  await sql`
    INSERT INTO alert_push_tokens (
      user_id,
      expo_push_token,
      platform,
      device_name,
      active,
      updated_at
    )
    VALUES (
      ${userId},
      ${expoPushToken},
      ${platform},
      ${deviceName},
      TRUE,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (expo_push_token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        device_name = EXCLUDED.device_name,
        active = TRUE,
        updated_at = CURRENT_TIMESTAMP
  `;
}

export async function sendAlertPushNotifications(alert: Alert) {
  await ensurePushTokenTable();

  const rows = await sql`
    SELECT
      users.id AS user_id,
      users.location,
      alert_push_tokens.expo_push_token,
      alert_preferences.general_notifications,
      alert_preferences.push_notifications,
      alert_preferences.location_alerts,
      alert_preferences.school_alerts,
      alert_preferences.sound_enabled,
      alert_preferences.alert_sound,
      alert_preferences.vibration_enabled,
      alert_preferences.quiet_hours_enabled,
      alert_preferences.quiet_hours_start,
      alert_preferences.quiet_hours_end
    FROM users
    INNER JOIN alert_push_tokens
      ON alert_push_tokens.user_id = users.id
      AND alert_push_tokens.active = TRUE
    LEFT JOIN alert_preferences
      ON alert_preferences.user_id = users.id
    WHERE LOWER(users.role) = 'resident'
  `;

  const messages = (rows as PushRecipientRow[])
    .filter((recipient) => shouldNotifyRecipient(alert, recipient))
    .map((recipient) => toExpoPushMessage(alert, recipient));

  if (messages.length === 0) {
    return;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push service returned ${response.status}.`);
  }

  const result = await response.json() as {
    data?: Array<{
      details?: {
        error?: string;
      };
      status?: string;
    }>;
  };

  await Promise.all(
    messages.map((message, index) => {
      const ticket = result.data?.[index];

      if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        return deactivatePushToken(message.to);
      }

      return Promise.resolve();
    }),
  );
}
