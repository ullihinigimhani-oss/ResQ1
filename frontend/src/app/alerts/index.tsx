import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AlertStatusBadge, RiskBadge } from '@/components/alerts/alert-badges';
import {
  BottomNavigation,
  DemoNotice,
  EmptyState,
  FilterChip,
  IconButton,
  LoadingState,
  PrimaryButton,
  QuickActionCard,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getActiveAlerts } from '@/services/alertService';
import type { Alert, AlertRiskLevel } from '@/types/alert';
import { formatDateTime, isAuthorityRole, plural, userArea } from '@/utils/format';

const riskRank: Record<AlertRiskLevel | string, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
};

function topAlert(alerts: Alert[]) {
  return [...alerts].sort((left, right) => {
    const riskDelta = (riskRank[right.riskLevel] ?? 0) - (riskRank[left.riskLevel] ?? 0);

    if (riskDelta !== 0) {
      return riskDelta;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  })[0] ?? null;
}

function riskTone(riskLevel: AlertRiskLevel | string | null) {
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    return 'red' as const;
  }

  if (riskLevel === 'Moderate') {
    return 'amber' as const;
  }

  return 'green' as const;
}

function AlertCard({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.alertCard, pressed && styles.pressed]}>
      <View style={styles.alertCardHeader}>
        <View style={styles.alertCardTitleBlock}>
          <Text style={styles.alertCardTitle}>{alert.title}</Text>
          <Text style={styles.alertCardMeta}>{alert.affectedArea} | {formatDateTime(alert.createdAt)}</Text>
        </View>
        <RiskBadge riskLevel={alert.riskLevel} />
      </View>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <View style={styles.badgeRow}>
        <AlertStatusBadge status={alert.status} />
        {alert.isRelevantToResident ? <StatusBadge label="Near You" tone="blue" /> : null}
      </View>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Near Me' | 'Critical'>('All');

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
      setErrorMessage('Unable to load active emergency alerts.');
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

  const activeAlert = useMemo(() => topAlert(alerts), [alerts]);
  const filteredAlerts = useMemo(() => {
    if (filter === 'Near Me') {
      return alerts.filter((alert) => alert.isRelevantToResident);
    }

    if (filter === 'Critical') {
      return alerts.filter((alert) => alert.riskLevel === 'Critical');
    }

    return alerts;
  }, [alerts, filter]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="Loading alert center..." />
      </SafeAreaView>
    );
  }

  const canPublish = isAuthorityRole(user.role);
  const area = userArea(user);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => void loadAlerts(true)} />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <IconButton
            accessibilityLabel="Back to dashboard"
            fallback="<"
            name="chevron.left"
            onPress={() => router.replace('/dashboard' as Href)}
          />
          {canPublish ? (
            <PrimaryButton title="Send Alert" onPress={() => router.push('/alerts/create' as Href)} />
          ) : null}
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Early Warning</Text>
          <Text style={styles.title}>Emergency Alerts</Text>
          <Text style={styles.subtitle}>Location: {area}</Text>
        </View>

        <SectionCard tone={activeAlert ? (riskTone(activeAlert.riskLevel) === 'red' ? 'danger' : 'white') : 'blue'}>
          <View style={styles.riskHeader}>
            <View style={styles.riskTextBlock}>
              <Text style={styles.heroEyebrow}>Current Risk Level</Text>
              <Text style={styles.heroTitle}>{activeAlert ? activeAlert.riskLevel : 'Low'}</Text>
              <Text style={styles.heroText}>
                {activeAlert
                  ? `${activeAlert.title} is active for ${activeAlert.affectedArea}.`
                  : 'No active emergency alerts are verified for your area.'}
              </Text>
            </View>
            {loadingAlerts ? <ActivityIndicator color={colors.red} /> : null}
          </View>
          <View style={styles.badgeRow}>
            <StatusBadge
              label={`${alerts.length} active ${plural(alerts.length, 'alert', 'alerts')}`}
              tone={activeAlert ? riskTone(activeAlert.riskLevel) : 'green'}
            />
            <StatusBadge label="Verified feed" tone="blue" />
          </View>
        </SectionCard>

        <SectionCard title="Active Alert Card">
          {activeAlert ? (
            <AlertCard
              alert={activeAlert}
              onPress={() => router.push({
                pathname: '/alerts/[id]',
                params: { id: String(activeAlert.id) },
              } as unknown as Href)}
            />
          ) : (
            <Text style={styles.mutedText}>No active emergency alert.</Text>
          )}
        </SectionCard>

        <SectionCard title="Current Conditions" subtitle="Only verified app data is shown.">
          <DemoNotice text="Rainfall, water-level, and weather sensors are not exposed by the Sprint 1 backend. ResQ1 is showing verified alert records instead of sample sensor values." />
        </SectionCard>

        <View style={styles.quickGrid}>
          <QuickActionCard
            body="Understand the current risk"
            fallback="R"
            name="gauge.with.dots.needle.67percent"
            title="Flood Risk Level"
            tone="amber"
            onPress={() => router.push('/alerts/risk-level' as Href)}
          />
          <QuickActionCard
            body="Review available records"
            fallback="H"
            name="clock.arrow.circlepath"
            title="Alert History"
            tone="blue"
            onPress={() => router.push('/alerts/history' as Href)}
          />
          <QuickActionCard
            body="Configure local alert UI"
            fallback="P"
            name="slider.horizontal.3"
            title="Preferences"
            tone="green"
            onPress={() => router.push('/alerts/preferences' as Href)}
          />
          <QuickActionCard
            body="Send verified local info"
            fallback="I"
            name="exclamationmark.triangle.fill"
            title="Report Incident"
            tone="red"
            onPress={() => router.push('/incidents/report' as Href)}
          />
        </View>

        <SectionCard title="Recent Alerts">
          <View style={styles.filterRow}>
            {(['All', 'Near Me', 'Critical'] as const).map((item) => (
              <FilterChip key={item} selected={filter === item} title={item} onPress={() => setFilter(item)} />
            ))}
          </View>

          {loadingAlerts && alerts.length === 0 ? <LoadingState message="Checking verified alerts..." /> : null}

          {errorMessage && alerts.length === 0 ? (
            <EmptyState
              body="Check your connection and try again."
              title="Unable to load emergency alerts"
              action={<PrimaryButton title="Retry" onPress={() => void loadAlerts()} />}
            />
          ) : null}

          {!loadingAlerts && !errorMessage && filteredAlerts.length === 0 ? (
            <Text style={styles.mutedText}>No alert records match this view.</Text>
          ) : null}

          {filteredAlerts.map((alert) => (
            <AlertCard
              alert={alert}
              key={alert.id}
              onPress={() => router.push({
                pathname: '/alerts/[id]',
                params: { id: String(alert.id) },
              } as unknown as Href)}
            />
          ))}
        </SectionCard>
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
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.red,
    ...typography.label,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.navy,
    ...typography.title,
  },
  subtitle: {
    color: colors.muted,
    ...typography.body,
  },
  riskHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  riskTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  heroEyebrow: {
    color: colors.red,
    ...typography.label,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  heroText: {
    color: colors.text,
    ...typography.body,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alertCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  alertCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  alertCardTitleBlock: {
    flex: 1,
    gap: 3,
  },
  alertCardTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  alertCardMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  alertMessage: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  mutedText: {
    color: colors.muted,
    ...typography.body,
  },
  pressed: {
    opacity: 0.72,
  },
});
