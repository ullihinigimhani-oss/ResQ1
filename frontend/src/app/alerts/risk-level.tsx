import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  DemoNotice,
  InfoRow,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getActiveAlerts } from '@/services/alertService';
import type { Alert, AlertRiskLevel } from '@/types/alert';
import { formatDateTime } from '@/utils/format';

const riskLevels: AlertRiskLevel[] = ['Low', 'Moderate', 'High', 'Critical'];
const riskRank: Record<AlertRiskLevel | string, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
};

const actions: Record<AlertRiskLevel, string[]> = {
  Low: ['Monitor official updates.', 'Keep emergency contacts available.'],
  Moderate: ['Prepare essential items.', 'Avoid unnecessary travel near flood-prone areas.'],
  High: ['Prepare to move to safer ground.', 'Check nearby safe shelter availability.'],
  Critical: ['Follow official evacuation instructions immediately.', 'Avoid flooded roads and bridges.'],
};

function topAlert(alerts: Alert[]) {
  return [...alerts].sort((left, right) => (riskRank[right.riskLevel] ?? 0) - (riskRank[left.riskLevel] ?? 0))[0] ?? null;
}

export default function FloodRiskLevelScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingAlerts(true);

    try {
      setAlerts(await getActiveAlerts(token));
    } finally {
      setLoadingAlerts(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadAlerts();
    }
  }, [loadAlerts, token]);

  const alert = useMemo(() => topAlert(alerts), [alerts]);
  const currentLevel = alert?.riskLevel ?? 'Low';

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading flood risk..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Flood Risk Level"
        title="Current Risk Level"
        subtitle="Derived from the latest verified active alert, not a live sensor calculation."
        onBack={() => router.replace('/alerts' as Href)}
      />

      <SectionCard tone={currentLevel === 'Critical' || currentLevel === 'High' ? 'danger' : 'white'}>
        <Text style={styles.currentLevel}>{currentLevel}</Text>
        <Text style={styles.currentCopy}>
          {alert
            ? `${alert.title} is active for ${alert.affectedArea}.`
            : 'No active alerts were returned by the backend, so the app shows Low risk.'}
        </Text>
        {loadingAlerts ? <LoadingState message="Refreshing risk level..." /> : null}
      </SectionCard>

      <SectionCard title="Risk Scale">
        <View style={styles.scaleList}>
          {riskLevels.map((level) => (
            <View key={level} style={[styles.scaleItem, level === currentLevel && styles.scaleItemActive]}>
              <Text style={styles.scaleLabel}>{level}</Text>
              {level === currentLevel ? <StatusBadge label="Current" tone="blue" /> : null}
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Recommended Actions">
        {actions[currentLevel].map((action, index) => (
          <InfoRow key={action} label={`Action ${index + 1}`} value={action} />
        ))}
      </SectionCard>

      <DemoNotice text="A future environmental risk engine can replace this derived view when rainfall, river level, and GIS data are available." />

      {alert ? (
        <SectionCard title="Source Alert">
          <InfoRow label="Alert Title" value={alert.title} />
          <InfoRow label="Affected Area" value={alert.affectedArea} />
          <InfoRow label="Issued" value={formatDateTime(alert.createdAt)} />
          <PrimaryButton
            title="View Alert Details"
            onPress={() => router.push({
              pathname: '/alerts/[id]',
              params: { id: String(alert.id) },
            } as unknown as Href)}
          />
        </SectionCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  currentLevel: {
    color: colors.navy,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  currentCopy: {
    color: colors.text,
    ...typography.body,
  },
  scaleList: {
    gap: spacing.sm,
  },
  scaleItem: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    padding: spacing.md,
  },
  scaleItemActive: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.deepBlue,
  },
  scaleLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
});
