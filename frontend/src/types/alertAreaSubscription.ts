export const alertAreaLabels = ['Home', 'School', 'Family', 'Other'] as const;

export type AlertAreaLabel = (typeof alertAreaLabels)[number];

export interface AlertAreaSubscription {
  id: number;
  userId: number;
  areaName: string;
  label: AlertAreaLabel;
  createdAt: string;
}

export interface CreateAlertAreaSubscriptionPayload {
  areaName: string;
  label: AlertAreaLabel;
}

export interface AlertAreaSubscriptionFieldErrors {
  areaName?: string;
  label?: string;
}
