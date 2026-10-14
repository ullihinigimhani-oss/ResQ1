import type { PreferredLanguage } from './auth.js';

export interface AlertPreferenceRow {
  id: number;
  user_id: number;
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
  preferred_language: PreferredLanguage | string | null;
  updated_at: Date | string;
}

export interface AlertPreferences {
  id: number;
  userId: number;
  generalNotifications: boolean;
  pushNotifications: boolean;
  locationAlerts: boolean;
  schoolAlerts: boolean;
  soundEnabled: boolean;
  alertSound: string;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  preferredLanguage: PreferredLanguage;
  updatedAt: string;
}

export interface UpdateAlertPreferencesInput {
  generalNotifications?: unknown;
  pushNotifications?: unknown;
  locationAlerts?: unknown;
  schoolAlerts?: unknown;
  soundEnabled?: unknown;
  alertSound?: unknown;
  vibrationEnabled?: unknown;
  quietHoursEnabled?: unknown;
  quietHoursStart?: unknown;
  quietHoursEnd?: unknown;
  preferredLanguage?: unknown;
}
