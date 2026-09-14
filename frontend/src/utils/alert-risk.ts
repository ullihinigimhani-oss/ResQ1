import type { Alert, AlertRiskLevel } from '@/types/alert';

export const riskRank: Record<AlertRiskLevel, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
};

const riskAliases: Record<string, AlertRiskLevel> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Moderate',
  moderate: 'Moderate',
  low: 'Low',
};

export function normalizeRiskLevel(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return riskAliases[normalized] ?? null;
}

export function compareAlertsByCurrentRisk(left: Alert, right: Alert) {
  const riskDelta = riskRank[right.riskLevel] - riskRank[left.riskLevel];

  if (riskDelta !== 0) {
    return riskDelta;
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

export function getCurrentRiskAlert(alerts: Alert[]) {
  return [...alerts].sort(compareAlertsByCurrentRisk)[0] ?? null;
}
