export const alertAreaLabels = ['Home', 'School', 'Family', 'Other'] as const;

export type AlertAreaLabel = (typeof alertAreaLabels)[number];

export interface AlertAreaSubscriptionRow {
  id: number;
  user_id: number;
  area_name: string;
  area_type: string | null;
  created_at: Date | string;
}

export interface AlertAreaSubscription {
  id: number;
  userId: number;
  areaName: string;
  label: AlertAreaLabel;
  createdAt: string;
}

export interface CreateAlertAreaSubscriptionInput {
  areaName?: unknown;
  label?: unknown;
}

export interface AlertAreaSubscriptionFieldErrors {
  areaName?: string;
  label?: string;
}
