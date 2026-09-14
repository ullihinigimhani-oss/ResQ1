import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

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
import { getCurrentRiskAlert, normalizeRiskLevel } from '@/utils/alert-risk';
import { formatDateTime } from '@/utils/format';

const riskLevels: AlertRiskLevel[] = ['Low', 'Moderate', 'High', 'Critical'];

const actions: Record<AlertRiskLevel, string[]> = {
  Low: ['Monitor official updates.', 'Keep emergency contacts available.'],
  Moderate: ['Prepare essential items.', 'Avoid unnecessary travel near flood-prone areas.'],
  High: ['Prepare to move to safer ground.', 'Check nearby safe shelter availability.'],
  Critical: ['Follow official evacuation instructions immediately.', 'Avoid flooded roads and bridges.'],
};

type RiskSource = {
  affectedArea: string;
  createdAt?: string | null;
  id?: number | string;
  riskLevel: AlertRiskLevel;
  title: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function FloodRiskLevelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasFetchedAlerts, setHasFetchedAlerts] = useState(false);

  const routeRiskSource = useMemo<RiskSource | null>(() => {
    const routeRiskLevel = normalizeRiskLevel(firstParam(params.riskLevel));

    if (!routeRiskLevel) {
      return null;
    }

    return {
      affectedArea: firstParam(params.affectedArea) ?? 'your area',
      createdAt: firstParam(params.createdAt) ?? null,
      id: firstParam(params.alertId),
      riskLevel: routeRiskLevel,
      title: firstParam(params.title) ?? 'Current flood risk',
    };
  }, [params.affectedArea, params.alertId, params.createdAt, params.riskLevel, params.title]);

  const loadAlerts = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingAlerts(true);
    setLoadError(null);

    try {
      setAlerts(await getActiveAlerts(token));
      setHasFetchedAlerts(true);
    } catch {
      setLoadError('Unable to refresh the latest risk level. Check your connection and try again.');
    } finally {
      setLoadingAlerts(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadAlerts();
    }
  }, [loadAlerts, token]);

  const fetchedAlert = useMemo(() => getCurrentRiskAlert(alerts), [alerts]);
  const riskSource = fetchedAlert ?? (hasFetchedAlerts ? null : routeRiskSource);
  const currentLevel = riskSource?.riskLevel ?? null;
  const showInitialLoading = loadingAlerts && !currentLevel;
  const showInitialError = Boolean(loadError) && !currentLevel;
  const showNoActiveRisk = hasFetchedAlerts && !currentLevel;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/alerts' as Href);
  }, [router]);

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
        onBack={handleBack}
      />

      <SectionCard tone={currentLevel === 'Critical' || currentLevel === 'High' ? 'danger' : 'white'}>
        {showInitialLoading ? (
          <View style={styles.initialRiskState}>
            <Text style={styles.currentEyebrow}>Current Risk</Text>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.red} />
              <Text style={styles.currentCopy}>Loading verified risk data...</Text>
            </View>
          </View>
        ) : showInitialError ? (
          <View style={styles.initialRiskState}>
            <Text style={styles.currentEyebrow}>Current Risk</Text>
            <Text style={styles.emptyRiskTitle}>Risk data unavailable</Text>
            <Text style={styles.currentCopy}>{loadError}</Text>
            <PrimaryButton title="Retry" onPress={() => void loadAlerts()} />
          </View>
        ) : currentLevel ? (
          <>
            <Text style={styles.currentLevel}>{currentLevel}</Text>
            <Text style={styles.currentCopy}>
              {riskSource
                ? `${riskSource.title} is active for ${riskSource.affectedArea}.`
                : 'Risk details are loading from the latest verified alert.'}
            </Text>
            {loadingAlerts ? (
              <View style={styles.refreshRow}>
                <ActivityIndicator color={colors.deepBlue} size="small" />
                <Text style={styles.refreshText}>Refreshing latest risk...</Text>
              </View>
            ) : null}
            {loadError ? <Text style={styles.refreshWarning}>{loadError}</Text> : null}
          </>
        ) : showNoActiveRisk ? (
          <View style={styles.initialRiskState}>
            <Text style={styles.currentEyebrow}>Current Risk</Text>
            <Text style={styles.emptyRiskTitle}>No active risk alert</Text>
            <Text style={styles.currentCopy}>
              No active alerts were returned by the backend for the current risk view.
            </Text>
          </View>
        ) : (
          <View style={styles.initialRiskState}>
            <Text style={styles.currentEyebrow}>Current Risk</Text>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.red} />
              <Text style={styles.currentCopy}>Preparing verified risk data...</Text>
            </View>
          </View>
        )}
      </SectionCard>

      {currentLevel ? (
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
      ) : null}

      {currentLevel ? (
        <SectionCard title="Recommended Actions">
          {actions[currentLevel].map((action, index) => (
            <InfoRow key={action} label={`Action ${index + 1}`} value={action} />
          ))}
        </SectionCard>
      ) : null}

      <DemoNotice text="A future environmental risk engine can replace this derived view when rainfall, river level, and GIS data are available." />

      {riskSource ? (
        <SectionCard title="Source Alert">
          <InfoRow label="Alert Title" value={riskSource.title} />
          <InfoRow label="Affected Area" value={riskSource.affectedArea} />
          {riskSource.createdAt ? <InfoRow label="Issued" value={formatDateTime(riskSource.createdAt)} /> : null}
          {riskSource.id ? (
            <PrimaryButton
              title="View Alert Details"
              onPress={() => router.push({
                pathname: '/alerts/[id]',
                params: { id: String(riskSource.id) },
              } as unknown as Href)}
            />
          ) : null}
        </SectionCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  currentEyebrow: {
    color: colors.red,
    ...typography.label,
    textTransform: 'uppercase',
  },
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
  emptyRiskTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  initialRiskState: {
    gap: spacing.sm,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  refreshRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  refreshText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  refreshWarning: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: spacing.sm,
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
