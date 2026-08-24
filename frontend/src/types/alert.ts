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

export interface School {
  id: number;
  schoolName: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  osmId: string | null;
  osmType: string | null;
  formattedAddress?: string | null;
  createdAt: string;
}

export interface SchoolSearchResult {
  id: number | null;
  schoolName: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  osmId: string | null;
  osmType: string | null;
  formattedAddress: string | null;
}

export interface SchoolSelectionPayload {
  id?: number | null;
  schoolName?: string;
  area?: string;
  latitude?: number | null;
  longitude?: number | null;
  osmId?: string | null;
  osmType?: string | null;
  formattedAddress?: string | null;
}

export interface Alert {
  id: number;
  title: string;
  disasterType: AlertDisasterType;
  affectedArea: string;
  alertAudience: AlertAudience;
  riskLevel: AlertRiskLevel;
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

export interface AlertAcknowledgementStatus {
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface AlertAcknowledgementSummary {
  acknowledged: number;
  acknowledgementRate: number | null;
  lastAcknowledgedAt: string | null;
  pending: number | null;
  targetedResidents: number | null;
}

export interface AlertAcknowledgementResident {
  acknowledged: boolean;
  acknowledgedAt: string | null;
  fullName: string;
  id: number;
  location: string | null;
}

export interface AlertAcknowledgementReport {
  acknowledgedResidents: AlertAcknowledgementResident[];
  pendingResidents: AlertAcknowledgementResident[];
  summary: AlertAcknowledgementSummary;
}

export interface CreateAlertPayload {
  title: string;
  disasterType: AlertDisasterType;
  affectedArea: string;
  alertAudience: AlertAudience;
  riskLevel: AlertRiskLevel;
  message: string;
  safetyInstructions: string;
  expiresAt: string | null;
  schoolIds: number[];
  schools: SchoolSelectionPayload[];
}

export interface UpdateAlertPayload extends CreateAlertPayload {
  auditAction?: AlertAuditAction;
  status: AlertStatus;
}

export type AlertFieldErrors = Partial<Record<keyof UpdateAlertPayload | 'schoolIds', string>>;
