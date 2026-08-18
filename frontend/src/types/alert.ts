export const alertRiskLevels = ['Low', 'Moderate', 'High', 'Critical'] as const;
export const alertStatuses = ['Active', 'Expired', 'Resolved'] as const;
export const alertDisasterTypes = ['Flood'] as const;

export type AlertRiskLevel = (typeof alertRiskLevels)[number];
export type AlertStatus = (typeof alertStatuses)[number];
export type AlertDisasterType = (typeof alertDisasterTypes)[number];

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

export interface CreateAlertPayload {
  title: string;
  disasterType: AlertDisasterType;
  affectedArea: string;
  riskLevel: AlertRiskLevel;
  message: string;
  safetyInstructions: string;
  expiresAt: string | null;
}

export type AlertFieldErrors = Partial<Record<keyof CreateAlertPayload, string>>;
