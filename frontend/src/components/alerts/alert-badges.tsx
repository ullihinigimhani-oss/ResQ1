import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import type { AlertRiskLevel, AlertStatus } from '@/types/alert';

type BadgeTone = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

export const riskTones: Record<AlertRiskLevel, BadgeTone> = {
  Low: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.blueBorder,
    color: BrandColors.deepBlue,
  },
  Moderate: {
    backgroundColor: BrandColors.warningSoft,
    borderColor: BrandColors.warningBorderStrong,
    color: BrandColors.warningText,
  },
  High: {
    backgroundColor: BrandColors.orangeSoft,
    borderColor: BrandColors.orange,
    color: BrandColors.orangeText,
  },
  Critical: {
    backgroundColor: BrandColors.criticalBackground,
    borderColor: BrandColors.criticalBorder,
    color: BrandColors.criticalText,
  },
};

const statusTones: Record<AlertStatus, BadgeTone> = {
  Active: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.successBorder,
    color: BrandColors.success,
  },
  Expired: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    color: BrandColors.muted,
  },
  Resolved: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.blueBorder,
    color: BrandColors.deepBlue,
  },
  Cancelled: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.redBorder,
    color: BrandColors.red,
  },
};

const fallbackTone: BadgeTone = {
  backgroundColor: BrandColors.lightBlue,
  borderColor: BrandColors.border,
  color: BrandColors.text,
};

function toneForRisk(riskLevel: AlertRiskLevel | string) {
  return riskTones[riskLevel as AlertRiskLevel] ?? fallbackTone;
}

function toneForStatus(status: AlertStatus | string) {
  return statusTones[status as AlertStatus] ?? fallbackTone;
}

export function RiskBadge({ riskLevel }: { riskLevel: AlertRiskLevel | string }) {
  const tone = toneForRisk(riskLevel);

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{String(riskLevel).toUpperCase()}</Text>
    </View>
  );
}

export function AlertStatusBadge({ status }: { status: AlertStatus | string }) {
  const tone = toneForStatus(status);

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{String(status).toUpperCase()}</Text>
    </View>
  );
}

export function LocationMatchBadge() {
  return (
    <View style={[styles.badge, styles.locationBadge]}>
      <Text style={[styles.badgeText, styles.locationBadgeText]}>NEAR YOU</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  locationBadge: {
    backgroundColor: BrandColors.primaryAction,
    borderColor: BrandColors.primaryAction,
  },
  locationBadgeText: {
    color: BrandColors.onPrimary,
  },
});
