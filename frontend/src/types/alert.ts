export const alertRiskLevels = ['Low', 'Moderate', 'High', 'Critical'] as const;
export const alertStatuses = ['Active', 'Expired', 'Resolved'] as const;
export const alertDisasterTypes = ['Flood'] as const;
export const alertAuditActions = ['PUBLISHED', 'UPDATED', 'CANCELLED', 'EXPIRED', 'RESOLVED'] as const;

export type AlertRiskLevel = (typeof alertRiskLevels)[number];
export type AlertStatus = (typeof alertStatuses)[number];
export type AlertDisasterType = (typeof alertDisasterTypes)[number];
export type AlertAuditAction = (typeof alertAuditActions)[number];

export interface Alert {
  id: number;
  title: string;
  disasterType: AlertDisasterType;
  affectedArea: string;
  riskLevel: AlertRiskLevel;
  message: string;
  safetyInstructions: string;
  status: AlertStatus;
  expiresAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  isRelevantToResident: boolean;
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

export interface AlertRiskHistoryPoint {
  id: number;
  alertId: number;
  action: AlertAuditAction | string;
  riskLevel: AlertRiskLevel | string;
  timestamp: string;
}

export interface CreateAlertPayload {
  title: string;
  disasterType: AlertDisasterType;
  affectedArea: string;
  riskLevel: AlertRiskLevel;
  message: string;
  safetyInstructions: string;
  expiresAt: string | null;
}

export interface UpdateAlertPayload extends CreateAlertPayload {
  auditAction?: AlertAuditAction;
  status: AlertStatus;
}

export type AlertFieldErrors = Partial<Record<keyof UpdateAlertPayload, string>>;
