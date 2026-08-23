import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  EmptyState,
  PrimaryButton,
  ScreenContainer,
} from '@/components/ui/app-components';
import { colors, radius, shadows, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getAlertHistory, isAlertApiError } from '@/services/alertService';
import type { AlertAuditEvent } from '@/types/alert';
import { isAuthorityRole } from '@/utils/format';

function formatAuditDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).replace(',', ' -');
}

function displayValue(value: string | null | undefined, fallback = 'Not available') {
  return value?.trim() || fallback;
}

function actionTone(action: string) {
  if (action === 'CANCELLED' || action === 'RESOLVED') {
    return {
      backgroundColor: colors.redSoft,
      borderColor: colors.red,
      color: colors.red,
    };
  }

  if (action === 'UPDATED') {
    return {
      backgroundColor: colors.lightBlue,
      borderColor: colors.sky,
      color: colors.deepBlue,
    };
  }

  if (action === 'EXPIRED') {
    return {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      color: colors.muted,
    };
  }

  return {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    color: colors.success,
  };
}

function statusTone(status: string | null) {
  if (status === 'Active') {
    return {
      backgroundColor: colors.successSoft,
      borderColor: colors.success,
      color: colors.success,
    };
  }

  if (status === 'Expired') {
    return {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      color: colors.muted,
    };
  }

  return {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    color: colors.red,
  };
}

function severityTone(riskLevel: string | null) {
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    return {
      backgroundColor: colors.redSoft,
      borderColor: colors.red,
      color: colors.red,
    };
  }

  if (riskLevel === 'Moderate') {
    return {
      backgroundColor: colors.amberSoft,
      borderColor: colors.amber,
      color: '#7A4B00',
    };
  }

  return {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    color: colors.deepBlue,
  };
}

function AuditBadge({
  label,
  tone,
}: {
  label: string;
  tone: { backgroundColor: string; borderColor: string; color: string };
}) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function riskLabel(event: AlertAuditEvent) {
  const previousRisk = event.previousRiskLevel;
  const newRisk = event.newRiskLevel;

  if (previousRisk && newRisk && previousRisk !== newRisk) {
    return `${previousRisk.toUpperCase()} -> ${newRisk.toUpperCase()}`;
  }

  return displayValue(newRisk ?? previousRisk, 'Risk unavailable').toUpperCase();
}

function statusChangeLabel(event: AlertAuditEvent) {
  const previousStatus = event.previousStatus;
  const newStatus = event.newStatus;

  if (previousStatus && newStatus && previousStatus !== newStatus) {
    return `${previousStatus.toUpperCase()} -> ${newStatus.toUpperCase()}`;
  }

  return null;
}

function HistoryLoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.red} size="large" />
      <Text style={styles.stateText}>Loading alert history...</Text>
    </View>
  );
}

function AlertHistoryRow({
  event,
  isLast,
  onOpen,
}: {
  event: AlertAuditEvent;
  isLast: boolean;
  onOpen: (alertId: number) => void;
}) {
  const action = displayValue(event.action, 'UPDATED').toUpperCase();
  const resultingStatus = displayValue(event.newStatus, 'Unknown');
  const statusChange = statusChangeLabel(event);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(event.alertId)}
      style={({ pressed }) => [
        styles.historyRow,
        isLast && styles.historyRowLast,
        pressed && styles.pressed,
      ]}>
      <View style={styles.rowContent}>
        <Text style={styles.timestampText}>{formatAuditDateTime(event.createdAt)}</Text>

        <View style={styles.rowTitleLine}>
          <View style={styles.rowTitleBlock}>
            <Text numberOfLines={1} style={styles.alertTitle}>{event.title}</Text>
            <Text numberOfLines={1} style={styles.areaText}>{event.affectedArea}</Text>
          </View>
          <Text style={styles.chevronText}>&gt;</Text>
        </View>

        <View style={styles.badgeRow}>
          <AuditBadge label={action} tone={actionTone(action)} />
          <AuditBadge label={resultingStatus} tone={statusTone(event.newStatus)} />
          <AuditBadge label={riskLabel(event)} tone={severityTone(event.newRiskLevel)} />
        </View>

        {statusChange ? <Text style={styles.changeText}>Status: {statusChange}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function AlertHistoryScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [history, setHistory] = useState<AlertAuditEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingHistory(true);
    setErrorMessage(null);

    try {
      setHistory(await getAlertHistory(token));
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert history error:', error);
      }

      setErrorMessage('Unable to load alert history.');
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadHistory();
    }
  }, [loadHistory, token]);

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

  if (!isAuthorityRole(user.role)) {
    return (
      <ScreenContainer>
        <AppHeader
          title="Alert History"
          subtitle="Track published, updated, and cancelled emergency alerts"
          onBack={() => router.replace('/alerts' as Href)}
        />
        <EmptyState
          title="Authority Access Required"
          body="Alert history is available only to authorized authority accounts."
          action={<PrimaryButton title="Back to Alerts" onPress={() => router.replace('/alerts' as Href)} />}
        />
      </ScreenContainer>
    );
  }

  const showLoading = loadingHistory && history.length === 0;
  const showError = Boolean(errorMessage) && history.length === 0 && !showLoading;
  const showEmpty = !showLoading && !showError && history.length === 0;

  return (
    <ScreenContainer>
      <AppHeader
        title="Alert History"
        subtitle="Track published, updated, and cancelled emergency alerts"
        onBack={() => router.replace('/alerts' as Href)}
      />

      {errorMessage && history.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>Unable to load alert history.</Text>
          <PrimaryButton title="Retry" onPress={() => void loadHistory()} />
        </View>
      ) : null}

      {showLoading ? <HistoryLoadingState /> : null}

      {showError ? (
        <EmptyState
          title="Unable to load alert history."
          body="Check your connection and try again."
          action={<PrimaryButton title="Retry" onPress={() => void loadHistory()} />}
        />
      ) : null}

      {showEmpty ? (
        <EmptyState
          title="No Alert History"
          body="Published, updated, and cancelled emergency alert activity will appear here."
        />
      ) : null}

      {!showLoading && !showError && history.length > 0 ? (
        <View style={styles.historyList}>
          {history.map((event, index) => (
            <AlertHistoryRow
              event={event}
              isLast={index === history.length - 1}
              key={event.id}
              onOpen={handleViewDetails}
            />
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  historyList: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
  },
  historyRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  rowContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  timestampText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  rowTitleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowTitleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  alertTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  areaText: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  chevronText: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: 2,
  },
  badge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
  },
  changeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
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
    ...typography.body,
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
