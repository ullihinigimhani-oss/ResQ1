export const alertRiskLevels = ['Low', 'Moderate', 'High', 'Critical'] as const;
export const alertStatuses = ['Active', 'Expired', 'Resolved'] as const;
export const alertDisasterTypes = ['Flood'] as const;

export type AlertRiskLevel = (typeof alertRiskLevels)[number];
export type AlertStatus = (typeof alertStatuses)[number];
export type AlertDisasterType = (typeof alertDisasterTypes)[number];

export interface AlertRow {
  id: number;
  title: string;
  disaster_type: AlertDisasterType | string;
  affected_area: string;
  risk_level: AlertRiskLevel | string;
  message: string;
  safety_instructions: string | null;
  status: AlertStatus | string | null;
  expires_at: Date | string | null;
  created_by: number | null;
  created_at: Date | string;
  updated_at: Date | string;
  is_relevant_to_resident?: boolean | null;
}

export interface Alert {
  id: number;
  title: string;
  disasterType: AlertDisasterType | string;
  affectedArea: string;
  riskLevel: AlertRiskLevel | string;
  message: string;
  safetyInstructions: string;
  status: AlertStatus;
  expiresAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  isRelevantToResident: boolean;
}

export interface CreateAlertInput {
  title?: unknown;
  disasterType?: unknown;
  affectedArea?: unknown;
  riskLevel?: unknown;
  message?: unknown;
  safetyInstructions?: unknown;
  expiresAt?: unknown;
}

export interface UpdateAlertInput extends CreateAlertInput {
  status?: unknown;
}

export interface ValidatedCreateAlertInput {
  title: string;
  disasterType: AlertDisasterType;
  affectedArea: string;
  riskLevel: AlertRiskLevel;
  message: string;
  safetyInstructions: string;
  expiresAt: string | null;
}

export interface ValidatedUpdateAlertInput extends ValidatedCreateAlertInput {
  status: AlertStatus;
}
