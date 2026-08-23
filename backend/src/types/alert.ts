export const alertRiskLevels = ['Low', 'Moderate', 'High', 'Critical'] as const;
export const alertStatuses = ['Active', 'Expired', 'Resolved'] as const;
export const alertDisasterTypes = ['Flood'] as const;
export const alertAuditActions = ['PUBLISHED', 'UPDATED', 'CANCELLED', 'EXPIRED', 'RESOLVED'] as const;
export const alertAudiences = ['ALL', 'GENERAL_PUBLIC', 'SCHOOL_EMERGENCY'] as const;

export type AlertRiskLevel = (typeof alertRiskLevels)[number];
export type AlertStatus = (typeof alertStatuses)[number];
export type AlertDisasterType = (typeof alertDisasterTypes)[number];
export type AlertAuditAction = (typeof alertAuditActions)[number];
export type AlertAudience = (typeof alertAudiences)[number];

export interface SchoolRow {
  id: number;
  school_name: string;
  area: string;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: Date | string;
}

export interface School {
  id: number;
  schoolName: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface AlertRow {
  id: number;
  title: string;
  disaster_type: AlertDisasterType | string;
  affected_area: string;
  alert_audience: AlertAudience | string | null;
  risk_level: AlertRiskLevel | string;
  message: string;
  safety_instructions: string | null;
  status: AlertStatus | string | null;
  expires_at: Date | string | null;
  created_by: number | null;
  created_at: Date | string;
  updated_at: Date | string;
  is_relevant_to_resident?: boolean | null;
  schools?: unknown;
}

export interface Alert {
  id: number;
  title: string;
  disasterType: AlertDisasterType | string;
  affectedArea: string;
  alertAudience: AlertAudience;
  riskLevel: AlertRiskLevel | string;
  message: string;
  safetyInstructions: string;
  status: AlertStatus;
  expiresAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  isRelevantToResident: boolean;
  schools: School[];
}

export interface AlertAuditRow {
  id: number;
  alert_id: number;
  action: AlertAuditAction | string;
  previous_status: AlertStatus | string | null;
  new_status: AlertStatus | string | null;
  previous_risk_level: AlertRiskLevel | string | null;
  new_risk_level: AlertRiskLevel | string | null;
  changed_by: number | null;
  created_at: Date | string;
  title: string;
  disaster_type: AlertDisasterType | string;
  affected_area: string;
}

export interface AlertAuditEvent {
  id: number;
  alertId: number;
  action: AlertAuditAction | string;
  title: string;
  disasterType: AlertDisasterType | string;
  affectedArea: string;
  previousStatus: AlertStatus | string | null;
  newStatus: AlertStatus | string | null;
  previousRiskLevel: AlertRiskLevel | string | null;
  newRiskLevel: AlertRiskLevel | string | null;
  changedBy: number | null;
  createdAt: string;
}

export interface AlertRiskHistoryRow {
  id: number;
  alert_id: number;
  action: AlertAuditAction | string;
  risk_level: AlertRiskLevel | string;
  created_at: Date | string;
}

export interface AlertRiskHistoryPoint {
  id: number;
  alertId: number;
  action: AlertAuditAction | string;
  riskLevel: AlertRiskLevel | string;
  timestamp: string;
}

export interface CreateAlertInput {
  title?: unknown;
  disasterType?: unknown;
  affectedArea?: unknown;
  alertAudience?: unknown;
  riskLevel?: unknown;
  message?: unknown;
  safetyInstructions?: unknown;
  expiresAt?: unknown;
  schoolIds?: unknown;
}

export interface UpdateAlertInput extends CreateAlertInput {
  auditAction?: unknown;
  status?: unknown;
}

export interface ValidatedCreateAlertInput {
  title: string;
  disasterType: AlertDisasterType;
  affectedArea: string;
  alertAudience: AlertAudience;
  riskLevel: AlertRiskLevel;
  message: string;
  safetyInstructions: string;
  expiresAt: string | null;
  schoolIds: number[];
}

export interface ValidatedUpdateAlertInput extends ValidatedCreateAlertInput {
  status: AlertStatus;
}
