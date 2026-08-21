import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, BottomNavigation, EmptyState, LoadingState, PrimaryButton } from '@/components/ui/app-components';
import { colors, radius, shadows, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getActiveAlerts } from '@/services/alertService';
import type { Alert, AlertRiskLevel } from '@/types/alert';
import { formatDateTime, isAuthorityRole, normalize, preview } from '@/utils/format';

type DashboardStateProps = {
  alerts: Alert[];
  errorMessage: string | null;
  loadingAlerts: boolean;
  onRetry: () => void;
  onViewAlert: (alertId: number) => void;
};

type ResidentDashboardProps = DashboardStateProps & {
  residentArea: string | null;
};

function normalizedArea(value: string | null | undefined) {
  return normalize(value).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function areaMatches(residentArea: string | null | undefined, alertArea: string | null | undefined) {
  const resident = normalizedArea(residentArea);
  const affected = normalizedArea(alertArea);

  return Boolean(resident && affected && (resident === affected || affected.includes(resident) || resident.includes(affected)));
}

const severityRank: Record<AlertRiskLevel, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
};

function issuedTimestamp(alert: Alert) {
  const timestamp = new Date(alert.createdAt).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareAlertsBySeverity(left: Alert, right: Alert) {
  const severityDelta = (severityRank[right.riskLevel] ?? 0) - (severityRank[left.riskLevel] ?? 0);

  if (severityDelta !== 0) {
    return severityDelta;
  }

  return issuedTimestamp(right) - issuedTimestamp(left);
}

const authoritySeverityTheme: Record<AlertRiskLevel, {
  accent: string;
  badgeBackground: string;
  badgeBorder: string;
  badgeText: string;
}> = {
  Critical: {
    accent: colors.red,
    badgeBackground: colors.redSoft,
    badgeBorder: colors.red,
    badgeText: colors.red,
  },
  High: {
    accent: colors.orange,
    badgeBackground: colors.orangeSoft,
    badgeBorder: colors.orange,
    badgeText: '#9A3412',
  },
  Moderate: {
    accent: colors.amber,
    badgeBackground: colors.amberSoft,
    badgeBorder: colors.amber,
    badgeText: '#7A4B00',
  },
  Low: {
    accent: colors.success,
    badgeBackground: colors.successSoft,
    badgeBorder: colors.success,
    badgeText: colors.success,
  },
};

function AlertAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.alertAction, pressed && styles.pressed]}>
      <Text style={styles.alertActionText}>{label}</Text>
    </Pressable>
  );
}

function SeverityBadge({ riskLevel }: { riskLevel: AlertRiskLevel }) {
  const severity = authoritySeverityTheme[riskLevel];

  return (
    <View
      style={[
        styles.authoritySeverityBadge,
        {
          backgroundColor: severity.badgeBackground,
          borderColor: severity.badgeBorder,
        },
      ]}>
      <Text style={[styles.authoritySeverityBadgeText, { color: severity.badgeText }]}>
        {riskLevel.toUpperCase()}
      </Text>
    </View>
  );
}

function ResidentLoadingState() {
  return (
    <View style={styles.residentLoadingState}>
      <ActivityIndicator color={colors.red} size="large" />
      <Text style={styles.loadingStateText}>Checking verified alerts...</Text>
    </View>
  );
}

function ResidentRiskAlertCard({
  alert,
  onViewAlert,
  residentArea,
}: {
  alert: Alert;
  onViewAlert: (alertId: number) => void;
  residentArea: string;
}) {
  return (
    <View style={[styles.residentAlertCard, styles.highRiskCard]}>
      <View style={styles.riskIndicatorRow}>
        <View style={styles.indicatorLabelGroup}>
          <Text style={[styles.riskIndicatorLabel, styles.yourAreaLabel]}>YOUR AREA</Text>
          <Text style={[styles.riskIndicatorLabel, styles.highRiskLabel]}>HIGH RISK</Text>
        </View>
        <Text style={[styles.riskIndicatorText, styles.highRiskText]}>{residentArea} is affected</Text>
      </View>

      <View style={styles.cardHeader}>
        <Text numberOfLines={2} style={styles.alertTitle}>
          {alert.title}
        </Text>
        <Text style={styles.statusText}>{alert.status}</Text>
      </View>

      <Text style={styles.areaText}>{alert.affectedArea}</Text>
      <Text style={styles.typeText}>Emergency Type: {alert.disasterType}</Text>
      <Text style={styles.riskText}>Risk Level: {alert.riskLevel.toUpperCase()}</Text>
      <Text numberOfLines={3} style={styles.messageText}>
        {preview(alert.safetyInstructions || alert.message, 132)}
      </Text>
      <Text style={styles.issuedText}>Issued: {formatDateTime(alert.createdAt)}</Text>

      <AlertAction label="View Alert" onPress={() => onViewAlert(alert.id)} />
    </View>
  );
}

function ResidentWarningAlertCard({ alert, onViewAlert }: { alert: Alert; onViewAlert: (alertId: number) => void }) {
  return (
    <View style={[styles.residentAlertCard, styles.warningCard]}>
      <View style={styles.riskIndicatorRow}>
        <Text style={[styles.riskIndicatorLabel, styles.warningLabel]}>WARNING</Text>
        <Text style={[styles.riskIndicatorText, styles.warningText]}>Other affected area</Text>
      </View>

      <View style={styles.cardHeader}>
        <Text numberOfLines={2} style={styles.alertTitle}>
          {alert.title}
        </Text>
        <Text style={styles.statusText}>{alert.status}</Text>
      </View>

      <Text style={styles.areaText}>{alert.affectedArea}</Text>
      <Text style={styles.typeText}>Emergency Type: {alert.disasterType}</Text>
      <Text style={styles.riskText}>Risk Level: {alert.riskLevel.toUpperCase()}</Text>
      <Text numberOfLines={2} style={styles.messageText}>
        {preview(alert.message, 112)}
      </Text>
      <Text style={styles.issuedText}>Issued: {formatDateTime(alert.createdAt)}</Text>

      <AlertAction label="View Alert" onPress={() => onViewAlert(alert.id)} />
    </View>
  );
}

function AllClearState({
  hasOtherAreaAlerts,
  residentArea,
}: {
  hasOtherAreaAlerts: boolean;
  residentArea: string | null;
}) {
  const areaName = residentArea?.trim();

  return (
    <View style={styles.allClearCard}>
      <Text style={styles.allClearLabel}>ALL CLEAR</Text>
      <Text style={styles.allClearTitle}>
        {hasOtherAreaAlerts ? 'Your Area is Currently Clear' : 'All Clear'}
      </Text>
      {hasOtherAreaAlerts && areaName ? (
        <Text style={styles.allClearArea}>Registered area: {areaName}</Text>
      ) : null}
      <Text style={styles.allClearText}>
        {hasOtherAreaAlerts
          ? 'No active emergency alert is currently affecting your registered area.'
          : 'There are currently no active emergency alerts.'}
      </Text>
    </View>
  );
}

function AuthorityHeader() {
  return (
    <View style={styles.authorityHeader}>
      <View style={styles.authorityHeaderTop}>
        <Text style={styles.title}>Authority Alert Center</Text>
        <View style={styles.authorityModeBadge}>
          <Text style={styles.authorityModeBadgeText}>AUTHORITY MODE</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Monitor and manage official emergency warnings</Text>
    </View>
  );
}

function AuthorityEmergencyActionCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.authorityEmergencyActionCard, pressed && styles.pressed]}>
      <View style={styles.authorityActionContent}>
        <View style={styles.authorityActionIcon}>
          <AppIcon fallback="!" name="exclamationmark.triangle.fill" size={22} tintColor={colors.red} />
        </View>
        <View style={styles.authorityActionTextBlock}>
          <Text style={styles.authorityActionTitle}>SEND EMERGENCY ALERT</Text>
          <Text style={styles.authorityActionBody}>
            Create and publish an official warning for affected communities.
          </Text>
        </View>
      </View>
      <View style={styles.authorityCreateButton}>
        <Text style={styles.authorityCreateButtonText}>+ Create Alert</Text>
      </View>
    </Pressable>
  );
}

function AuthorityAlertSummary({ alerts }: { alerts: Alert[] }) {
  const severityCounts = alerts.reduce(
    (counts, alert) => ({
      ...counts,
      [alert.riskLevel]: counts[alert.riskLevel] + 1,
    }),
    {
      Critical: 0,
      High: 0,
      Low: 0,
      Moderate: 0,
    } satisfies Record<AlertRiskLevel, number>,
  );
  const summaryItems = [
    { label: 'Active Alerts', value: alerts.length, accent: colors.navy },
    { label: 'Critical', value: severityCounts.Critical, accent: authoritySeverityTheme.Critical.accent },
    { label: 'High', value: severityCounts.High, accent: authoritySeverityTheme.High.accent },
    { label: 'Moderate', value: severityCounts.Moderate, accent: authoritySeverityTheme.Moderate.accent },
    { label: 'Low', value: severityCounts.Low, accent: authoritySeverityTheme.Low.accent },
  ];

  return (
    <View style={styles.authoritySummaryGrid}>
      {summaryItems.map((item) => (
        <View key={item.label} style={[styles.authoritySummaryChip, { borderTopColor: item.accent }]}>
          <Text style={styles.authoritySummaryValue}>{item.value}</Text>
          <Text style={styles.authoritySummaryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function AuthorityActionRow({
  onEditAlert,
  onViewAlert,
}: {
  onEditAlert: () => void;
  onViewAlert: () => void;
}) {
  return (
    <View style={styles.authorityCardActions}>
      <Pressable
        accessibilityRole="button"
        onPress={onViewAlert}
        style={({ pressed }) => [styles.authorityManageButton, pressed && styles.pressed]}>
        <Text style={styles.authorityManageButtonText}>View / Manage Alert -&gt;</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onEditAlert}
        style={({ pressed }) => [styles.authorityEditButton, pressed && styles.pressed]}>
        <Text style={styles.authorityEditButtonText}>Edit Alert</Text>
      </Pressable>
    </View>
  );
}

function AuthorityAlertCard({
  alert,
  onEditAlert,
  onViewAlert,
}: {
  alert: Alert;
  onEditAlert: (alertId: number) => void;
  onViewAlert: (alertId: number) => void;
}) {
  const severity = authoritySeverityTheme[alert.riskLevel];

  return (
    <View style={[styles.authorityAlertCard, { borderLeftColor: severity.accent }]}>
      <View style={styles.authorityAlertTopRow}>
        <View style={styles.authorityAlertTitleRow}>
          <View
            style={[
              styles.authorityAlertIcon,
              { backgroundColor: severity.badgeBackground, borderColor: severity.badgeBorder },
            ]}>
            <AppIcon fallback="!" name="exclamationmark.triangle.fill" size={16} tintColor={severity.accent} />
          </View>
          <Text numberOfLines={2} style={styles.authorityAlertTitle}>
            {alert.title}
          </Text>
        </View>
        <Text style={styles.authorityStatusBadge}>
          {alert.status.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.areaText}>{alert.affectedArea}</Text>

      <View style={styles.authorityCardMetaRow}>
        <SeverityBadge riskLevel={alert.riskLevel} />
        <Text style={styles.compactMetaText}>Issued: {formatDateTime(alert.createdAt)}</Text>
      </View>

      <AuthorityActionRow
        onEditAlert={() => onEditAlert(alert.id)}
        onViewAlert={() => onViewAlert(alert.id)}
      />
    </View>
  );
}

function ResidentDashboard({
  alerts,
  errorMessage,
  loadingAlerts,
  onRetry,
  onViewAlert,
  residentArea,
}: ResidentDashboardProps) {
  const showInitialLoading = loadingAlerts && alerts.length === 0;
  const showError = Boolean(errorMessage) && alerts.length === 0 && !showInitialLoading;
  const showRiskIndicators = !showInitialLoading && !showError;
  const residentAreaName = residentArea?.trim() || null;
  const residentAreaLabel = residentAreaName || 'your area';
  const prioritizedAlerts = [...alerts].sort(compareAlertsBySeverity);
  const alertGroups = prioritizedAlerts.reduce(
    (groups, alert) => {
      if (areaMatches(residentArea, alert.affectedArea)) {
        groups.residentAreaAlerts.push(alert);
      } else {
        groups.otherAreaAlerts.push(alert);
      }

      return groups;
    },
    {
      otherAreaAlerts: [] as Alert[],
      residentAreaAlerts: [] as Alert[],
    },
  );
  const { otherAreaAlerts, residentAreaAlerts } = alertGroups;

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Alerts</Text>
        <Text style={styles.subtitle}>Verified emergency warnings for your area</Text>
      </View>

      {errorMessage && alerts.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
          <AlertAction label="Retry" onPress={onRetry} />
        </View>
      ) : null}

      {showInitialLoading ? <ResidentLoadingState /> : null}

      {showError ? (
        <EmptyState
          body="Check your connection and try again."
          title="Unable to load emergency alerts."
          action={<PrimaryButton title="Retry" onPress={onRetry} />}
        />
      ) : null}

      {showRiskIndicators && residentAreaAlerts.length > 0 ? (
        <View style={styles.alertList}>
          {residentAreaAlerts.map((alert) => (
            <ResidentRiskAlertCard
              alert={alert}
              key={alert.id}
              onViewAlert={onViewAlert}
              residentArea={residentAreaLabel}
            />
          ))}
        </View>
      ) : null}

      {showRiskIndicators && residentAreaAlerts.length === 0 ? (
        <AllClearState hasOtherAreaAlerts={otherAreaAlerts.length > 0} residentArea={residentAreaName} />
      ) : null}

      {showRiskIndicators && otherAreaAlerts.length > 0 ? (
        <View style={styles.alertList}>
          {otherAreaAlerts.map((alert) => (
            <ResidentWarningAlertCard alert={alert} key={alert.id} onViewAlert={onViewAlert} />
          ))}
        </View>
      ) : null}
    </>
  );
}

function AuthorityDashboard({
  alerts,
  errorMessage,
  loadingAlerts,
  onCreateAlert,
  onEditAlert,
  onRetry,
  onViewAlert,
}: DashboardStateProps & { onCreateAlert: () => void; onEditAlert: (alertId: number) => void }) {
  const showInitialLoading = loadingAlerts && alerts.length === 0;
  const showError = Boolean(errorMessage) && alerts.length === 0 && !showInitialLoading;
  const showEmpty = !showInitialLoading && !showError && alerts.length === 0;
  const sortedAlerts = [...alerts].sort(compareAlertsBySeverity);

  return (
    <>
      <AuthorityHeader />
      <AuthorityEmergencyActionCard onPress={onCreateAlert} />

      {errorMessage && alerts.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <AuthorityAlertSummary alerts={alerts} />

      <View style={styles.authoritySectionHeader}>
        <View style={styles.authoritySectionTitleBlock}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          <Text style={styles.authoritySectionSubtitle}>Official warnings currently published</Text>
        </View>
        <View style={styles.activeCountBadge}>
          <Text style={styles.activeCountBadgeText}>{alerts.length} ACTIVE</Text>
        </View>
      </View>

      {showInitialLoading ? <LoadingState message="Checking verified alerts..." /> : null}

      {showError ? (
        <EmptyState
          body="Check your connection and try again."
          title="Unable to load emergency alerts"
          action={<PrimaryButton title="Retry" onPress={onRetry} />}
        />
      ) : null}

      {showEmpty ? (
        <EmptyState
          body="There are currently no published emergency warnings."
          title="No Active Alerts"
          action={<PrimaryButton title="Create Alert" tone="red" onPress={onCreateAlert} />}
        />
      ) : null}

      {!showInitialLoading && !showError && alerts.length > 0 ? (
        <View style={styles.compactAlertList}>
          {sortedAlerts.map((alert) => (
            <AuthorityAlertCard
              alert={alert}
              key={alert.id}
              onEditAlert={onEditAlert}
              onViewAlert={onViewAlert}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAlerts = useCallback(async (refresh = false) => {
    if (!token) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingAlerts(true);
    }

    setErrorMessage(null);

    try {
      setAlerts(await getActiveAlerts(token));
    } catch {
      setErrorMessage('Unable to load emergency alerts.');
    } finally {
      setLoadingAlerts(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadAlerts();
    }
  }, [loadAlerts, token]);

  const handleCreateAlert = useCallback(() => {
    router.push('/alerts/create' as Href);
  }, [router]);

  const handleViewAlert = useCallback((alertId: number) => {
    router.push({
      pathname: '/alerts/[id]',
      params: { id: String(alertId) },
    } as unknown as Href);
  }, [router]);

  const handleEditAlert = useCallback((alertId: number) => {
    router.push({
      pathname: '/alerts/[id]/edit',
      params: { id: String(alertId) },
    } as unknown as Href);
  }, [router]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user || !user.role) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="Loading alert center..." />
      </SafeAreaView>
    );
  }

  const dashboardProps: DashboardStateProps = {
    alerts,
    errorMessage,
    loadingAlerts,
    onRetry: () => void loadAlerts(),
    onViewAlert: handleViewAlert,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => void loadAlerts(true)} />
        }
        showsVerticalScrollIndicator={false}>
        {isAuthorityRole(user.role) ? (
          <AuthorityDashboard
            {...dashboardProps}
            onCreateAlert={handleCreateAlert}
            onEditAlert={handleEditAlert}
          />
        ) : (
          <ResidentDashboard {...dashboardProps} residentArea={user.location} />
        )}
      </ScrollView>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: 96,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.navy,
    ...typography.title,
  },
  subtitle: {
    color: colors.muted,
    ...typography.body,
  },
  alertList: {
    gap: spacing.md,
  },
  compactAlertList: {
    gap: spacing.sm,
  },
  residentAlertCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  residentLoadingState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 132,
    padding: spacing.lg,
    ...shadows.card,
  },
  loadingStateText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  highRiskCard: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    borderWidth: 2,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.amber,
  },
  riskIndicatorRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  indicatorLabelGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  riskIndicatorLabel: {
    borderRadius: radius.sm,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
  },
  yourAreaLabel: {
    backgroundColor: colors.navy,
    color: colors.white,
  },
  highRiskLabel: {
    backgroundColor: colors.red,
    color: colors.white,
  },
  warningLabel: {
    backgroundColor: colors.amber,
    color: colors.white,
  },
  riskIndicatorText: {
    flexBasis: '100%',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'left',
  },
  highRiskText: {
    color: colors.red,
  },
  warningText: {
    color: '#7A4B00',
  },
  allClearCard: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  allClearLabel: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  allClearTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  allClearArea: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  allClearText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  authorityHeader: {
    gap: spacing.xs,
  },
  authorityHeaderTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  authorityModeBadge: {
    backgroundColor: colors.navy,
    borderColor: colors.deepBlue,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  authorityModeBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  authorityEmergencyActionCard: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    borderLeftColor: colors.red,
    borderLeftWidth: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.card,
  },
  authorityActionContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  authorityActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  authorityActionTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  authorityActionTitle: {
    color: colors.red,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  authorityActionBody: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  authorityCreateButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.red,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 148,
    paddingHorizontal: spacing.lg,
  },
  authorityCreateButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  authoritySummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  authoritySummaryChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderTopWidth: 3,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '30%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  authoritySummaryValue: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  authoritySummaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  authorityAlertCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderLeftWidth: 5,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  authorityAlertTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  authorityAlertTitleRow: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  authorityAlertIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  authorityStatusBadge: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.success,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'center',
  },
  authorityCardMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  authoritySeverityBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  authoritySeverityBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  authorityCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  authorityManageButton: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: '56%',
    paddingHorizontal: spacing.md,
  },
  authorityManageButtonText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  authorityEditButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: '34%',
    paddingHorizontal: spacing.md,
  },
  authorityEditButtonText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
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
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  authorityAlertTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  statusText: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  areaText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  typeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  riskText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  issuedText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  alertAction: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  alertActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  sectionHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.navy,
    ...typography.sectionTitle,
  },
  authoritySectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  authoritySectionTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  authoritySectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  activeCountBadge: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeCountBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  compactMetaText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
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
