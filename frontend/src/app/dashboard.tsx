import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DemoNotice,
  HomeHeader,
  LoadingState,
  PrimaryButton,
  QuickActionCard,
  ScreenContainer,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getActiveAlerts } from '@/services/alertService';
import { getMyIncidents } from '@/services/incidentService';
import { getShelters } from '@/services/shelterService';
import type { Alert, AlertRiskLevel } from '@/types/alert';
import type { Incident } from '@/types/incident';
import type { Shelter } from '@/types/shelter';
import { firstName, formatDateTime, isAuthorityRole, plural, userArea } from '@/utils/format';

const riskRank: Record<AlertRiskLevel | string, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
};

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

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

function availableSpaces(shelter: Shelter) {
  if (shelter.availableSpaces !== null) {
    return shelter.availableSpaces;
  }

  if (shelter.capacity !== null && shelter.currentOccupancy !== null) {
    return Math.max(shelter.capacity - shelter.currentOccupancy, 0);
  }

  return null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryWarning, setSummaryWarning] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingSummary(true);
    setSummaryWarning(null);

    const [alertResult, incidentResult, shelterResult] = await Promise.allSettled([
      getActiveAlerts(token),
      getMyIncidents(token),
      getShelters(token),
    ]);

    if (alertResult.status === 'fulfilled') {
      setAlerts(alertResult.value);
    }

    if (incidentResult.status === 'fulfilled') {
      setIncidents(incidentResult.value);
    }

    if (shelterResult.status === 'fulfilled') {
      setShelters(shelterResult.value);
    }

    const failed = [alertResult, incidentResult, shelterResult].some((result) => result.status === 'rejected');

    if (failed) {
      setSummaryWarning('Some live dashboard data could not be refreshed.');
    }

    setLoadingSummary(false);
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadSummary();
    }
  }, [loadSummary, token]);

  const currentAlert = useMemo(() => topAlert(alerts), [alerts]);
  const latestIncident = incidents[0] ?? null;
  const nearestShelter = shelters[0] ?? null;

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Preparing your ResQ1 dashboard..." />
      </ScreenContainer>
    );
  }

  const residentFirstName = firstName(user.fullName);
  const canPublishAlerts = isAuthorityRole(user.role);
  const alertCountLabel = `${alerts.length} active ${plural(alerts.length, 'alert', 'alerts')}`;

  return (
    <ScreenContainer>
      <HomeHeader
        greeting={`${greeting()}, ${residentFirstName}`}
        userName={user.fullName}
        onNotifications={() => router.push('/alerts/preferences' as Href)}
        onProfile={() => router.push('/profile' as Href)}
      />

      <SectionCard tone={currentAlert ? (riskTone(currentAlert.riskLevel) === 'red' ? 'danger' : 'white') : 'blue'}>
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroEyebrow}>Current Risk Level</Text>
            <Text style={styles.heroTitle}>{currentAlert ? currentAlert.riskLevel : 'No Active Alerts'}</Text>
            <Text style={styles.heroText}>
              {currentAlert
                ? `${currentAlert.title} for ${currentAlert.affectedArea}.`
                : 'No active emergency alerts are verified for your area right now.'}
            </Text>
          </View>
          {loadingSummary ? <ActivityIndicator color={colors.red} /> : null}
        </View>
        <View style={styles.heroMetaRow}>
          <StatusBadge
            label={currentAlert ? alertCountLabel : 'All clear'}
            tone={currentAlert ? riskTone(currentAlert.riskLevel) : 'green'}
          />
          <StatusBadge label={userArea(user)} tone="blue" />
        </View>
        <PrimaryButton
          title={currentAlert ? 'View Risk Details' : 'Open Alert Center'}
          onPress={() => router.push(currentAlert ? '/alerts/risk-level' as Href : '/alerts' as Href)}
          tone={currentAlert && riskTone(currentAlert.riskLevel) === 'red' ? 'red' : 'navy'}
        />
      </SectionCard>

      {summaryWarning ? <DemoNotice text={summaryWarning} /> : null}

      <View style={styles.quickGrid}>
        <QuickActionCard
          body="Submit a verified flood report"
          fallback="R"
          name="exclamationmark.triangle.fill"
          title="Report Incident"
          tone="red"
          onPress={() => router.push('/incidents/report' as Href)}
        />
        <QuickActionCard
          body="Review live official warnings"
          fallback="A"
          name="bell.fill"
          title="Emergency Alerts"
          tone="blue"
          onPress={() => router.push('/alerts' as Href)}
        />
        <QuickActionCard
          body="Find shelter availability"
          fallback="S"
          name="house.and.flag.fill"
          title="Find Safe Shelter"
          tone="green"
          onPress={() => router.push('/shelters' as Href)}
        />
        <QuickActionCard
          body="Prepare a request for help"
          fallback="H"
          name="cross.case.fill"
          title="Request Assistance"
          tone="amber"
          onPress={() => router.push('/assistance' as Href)}
        />
      </View>

      <SectionCard title="Recent Alerts" subtitle="Real active alerts from the Sprint 1 backend.">
        {currentAlert ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/alerts/[id]',
              params: { id: String(currentAlert.id) },
            } as unknown as Href)}
            style={({ pressed }) => [styles.compactRow, pressed && styles.pressed]}>
            <View style={styles.compactTextBlock}>
              <Text style={styles.compactTitle}>{currentAlert.title}</Text>
              <Text style={styles.compactMeta}>{currentAlert.affectedArea}</Text>
            </View>
            <StatusBadge label={currentAlert.riskLevel} tone={riskTone(currentAlert.riskLevel)} />
          </Pressable>
        ) : (
          <Text style={styles.mutedText}>No active emergency alerts.</Text>
        )}
      </SectionCard>

      <SectionCard title="Latest Incident Status" subtitle="Your most recent report status from the backend.">
        {latestIncident ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/incidents/[id]',
              params: { id: String(latestIncident.id) },
            } as unknown as Href)}
            style={({ pressed }) => [styles.compactRow, pressed && styles.pressed]}>
            <View style={styles.compactTextBlock}>
              <Text style={styles.compactTitle}>{latestIncident.title}</Text>
              <Text style={styles.compactMeta}>Updated {formatDateTime(latestIncident.updatedAt)}</Text>
            </View>
            <StatusBadge
              label={latestIncident.status}
              tone={latestIncident.status === 'Resolved' ? 'green' : 'blue'}
            />
          </Pressable>
        ) : (
          <Text style={styles.mutedText}>No incident reports submitted yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Nearest Safe Shelter" subtitle="Verified shelter data from Neon.">
        {nearestShelter ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/shelters/[id]',
              params: { id: String(nearestShelter.id) },
            } as unknown as Href)}
            style={({ pressed }) => [styles.compactRow, pressed && styles.pressed]}>
            <View style={styles.compactTextBlock}>
              <Text style={styles.compactTitle}>{nearestShelter.name}</Text>
              <Text style={styles.compactMeta}>
                {nearestShelter.area} | {availableSpaces(nearestShelter) ?? 'Capacity pending'} spaces available
              </Text>
            </View>
            <StatusBadge label={nearestShelter.status} tone={nearestShelter.status === 'Open' ? 'green' : 'amber'} />
          </Pressable>
        ) : (
          <Text style={styles.mutedText}>Shelter availability is not loaded yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Safety Tip" tone="navy">
        <Text style={styles.safetyText}>
          Keep essentials ready, avoid flooded roads, and follow official evacuation instructions when alerts become active.
        </Text>
      </SectionCard>

      {canPublishAlerts ? (
        <SectionCard title="Authority Tools" subtitle="Visible only to admin and authority roles.">
          <PrimaryButton title="Publish Emergency Alert" onPress={() => router.push('/alerts/create' as Href)} />
        </SectionCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  heroTitleBlock: {
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
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },
  heroText: {
    color: colors.text,
    ...typography.body,
  },
  heroMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  compactRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  compactTextBlock: {
    flex: 1,
    gap: 3,
  },
  compactTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  compactMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  mutedText: {
    color: colors.muted,
    ...typography.body,
  },
  safetyText: {
    color: colors.sky,
    ...typography.body,
  },
  pressed: {
    opacity: 0.72,
  },
});
