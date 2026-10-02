import type { PreferredLanguage } from '@/types/auth';

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

export type UpdateAlertPreferencesPayload = Pick<
  AlertPreferences,
  | 'alertSound'
  | 'generalNotifications'
  | 'locationAlerts'
  | 'preferredLanguage'
  | 'pushNotifications'
  | 'quietHoursEnabled'
  | 'quietHoursEnd'
  | 'quietHoursStart'
  | 'schoolAlerts'
  | 'soundEnabled'
  | 'vibrationEnabled'
>;
