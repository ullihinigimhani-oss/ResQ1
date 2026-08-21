import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, shadows, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getAlertHistory, isAlertApiError } from '@/services/alertService';
import type { Alert, AlertRiskLevel, AlertStatus } from '@/types/alert';
import { formatDateTime, preview } from '@/utils/format';

function riskTone(riskLevel: AlertRiskLevel | string) {
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    return 'red';
  }

  if (riskLevel === 'Moderate') {
    return 'amber';
  }

  return 'blue';
}

function statusTone(status: AlertStatus | string) {
  if (status === 'Resolved') {
    return 'green';
  }

  if (status === 'Expired') {
    return 'muted';
  }

  return 'amber';
}

function endTimeLabel(alert: Alert) {
  if (alert.expiresAt) {
    return `Expired: ${formatDateTime(alert.expiresAt)}`;
  }

  if (alert.status !== 'Active') {
    return `Ended: ${formatDateTime(alert.updatedAt)}`;
  }

  return 'End time: Not available';
}

function HistoryLoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.red} size="large" />
      <Text style={styles.stateText}>Loading alert history...</Text>
    </View>
  );
}

function AlertHistoryCard({ alert, onViewDetails }: { alert: Alert; onViewDetails: (alertId: number) => void }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={2} style={styles.alertTitle}>
          {alert.title}
        </Text>
        <StatusBadge label={alert.status} tone={statusTone(alert.status)} />
      </View>

      <Text style={styles.areaText}>{alert.affectedArea}</Text>

      <View style={styles.badgeRow}>
        <StatusBadge label={String(alert.riskLevel)} tone={riskTone(alert.riskLevel)} />
        <StatusBadge label={alert.disasterType} tone="blue" />
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.metaText}>Issued: {formatDateTime(alert.createdAt)}</Text>
        <Text style={styles.metaText}>{endTimeLabel(alert)}</Text>
      </View>

      <Text numberOfLines={3} style={styles.messageText}>
        {preview(alert.message, 136)}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => onViewDetails(alert.id)}
        style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}>
        <Text style={styles.detailsButtonText}>View Details</Text>
      </Pressable>
    </View>
  );
}

export default function AlertHistoryScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingAlerts(true);
    setErrorMessage(null);

    try {
      setAlerts(await getAlertHistory(token));
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert history error:', error);
      }

      setErrorMessage('Unable to load alert history.');
    } finally {
      setLoadingAlerts(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadAlerts();
    }
  }, [loadAlerts, token]);

  const handleViewDetails = useCallback((alertId: number) => {
    router.push({
      pathname: '/alerts/[id]',
      params: { id: String(alertId) },
    } as unknown as Href);
  }, [router]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <HistoryLoadingState />
      </ScreenContainer>
    );
  }

  const showLoading = loadingAlerts && alerts.length === 0;
  const showError = Boolean(errorMessage) && alerts.length === 0 && !showLoading;
  const showEmpty = !showLoading && !showError && alerts.length === 0;

  return (
    <ScreenContainer>
      <AppHeader
        title="Alert History"
        subtitle="Previous emergency warnings and updates"
        onBack={() => router.replace('/alerts' as Href)}
      />

      {errorMessage && alerts.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
          <PrimaryButton title="Retry" onPress={() => void loadAlerts()} />
        </View>
      ) : null}

      {showLoading ? <HistoryLoadingState /> : null}

      {showError ? (
        <EmptyState
          title="Unable to load alert history"
          body="Check your connection and try again."
          action={<PrimaryButton title="Retry" onPress={() => void loadAlerts()} />}
        />
      ) : null}

      {showEmpty ? (
        <EmptyState
          title="No Alert History"
          body="Previous emergency alerts will appear here."
        />
      ) : null}

      {!showLoading && !showError && alerts.length > 0 ? (
        <View style={styles.historyList}>
          {alerts.map((alert) => (
            <AlertHistoryCard alert={alert} key={alert.id} onViewDetails={handleViewDetails} />
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  historyList: {
    gap: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  alertTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  areaText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaBlock: {
    gap: 3,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  detailsButton: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  detailsButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 220,
    padding: spacing.xl,
  },
  stateText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  inlineError: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  inlineErrorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
