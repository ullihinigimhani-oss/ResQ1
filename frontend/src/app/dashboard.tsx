import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DemoNotice,
  HomeHeader,
  LoadingState,
  PrimaryButton,
  QuickActionCard,
  ScreenContainer,
  SectionCard,
  SecondaryButton,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  dashboardSummaryCacheKey,
  emptyDashboardSummary,
  fetchDashboardSummary,
  getCachedDashboardSummary,
  setCachedDashboardSummary,
  type DashboardSummary,
} from '@/services/dashboardSummaryService';
import type { Alert, AlertRiskLevel } from '@/types/alert';
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
  const dashboardCacheKey = dashboardSummaryCacheKey(token, user?.id);
  const cachedSummary = getCachedDashboardSummary(dashboardCacheKey);
  const initialSummary = cachedSummary ?? emptyDashboardSummary();
  const [alerts, setAlerts] = useState<DashboardSummary['alerts']>(() => initialSummary.alerts);
  const [communityNotifications, setCommunityNotifications] = useState<DashboardSummary['communityNotifications']>(
    () => initialSummary.communityNotifications,
  );
  const [incidents, setIncidents] = useState<DashboardSummary['incidents']>(() => initialSummary.incidents);
  const [shelters, setShelters] = useState<DashboardSummary['shelters']>(() => initialSummary.shelters);
  const [hasLoadedSummary, setHasLoadedSummary] = useState(() => Boolean(cachedSummary));
  const [loadingSummary, setLoadingSummary] = useState(() => !cachedSummary);
  const [initialSummaryError, setInitialSummaryError] = useState<string | null>(null);
  const [summaryWarning, setSummaryWarning] = useState<string | null>(null);
  const activeCacheKeyRef = useRef(dashboardCacheKey);
  const hasLoadedSummaryRef = useRef(Boolean(cachedSummary));
  const summaryRef = useRef<DashboardSummary>(initialSummary);
  const userRole = user?.role;

  const applySummary = useCallback((summary: DashboardSummary) => {
    summaryRef.current = summary;
    setAlerts(summary.alerts);
    setCommunityNotifications(summary.communityNotifications);
    setIncidents(summary.incidents);
    setShelters(summary.shelters);
  }, []);

  useEffect(() => {
    if (activeCacheKeyRef.current === dashboardCacheKey) {
      return;
    }

    activeCacheKeyRef.current = dashboardCacheKey;

    const nextCachedSummary = getCachedDashboardSummary(dashboardCacheKey);
    const nextSummary = nextCachedSummary ?? emptyDashboardSummary();
    const hasCachedSummary = Boolean(nextCachedSummary);

    applySummary(nextSummary);
    hasLoadedSummaryRef.current = hasCachedSummary;
    setHasLoadedSummary(hasCachedSummary);
    setLoadingSummary(Boolean(dashboardCacheKey) && !hasCachedSummary);
    setInitialSummaryError(null);
    setSummaryWarning(null);
  }, [applySummary, dashboardCacheKey]);

  const loadSummary = useCallback(async () => {
    if (!token || !userRole || !dashboardCacheKey) {
      return;
    }

    const hadExistingSummary = hasLoadedSummaryRef.current;

    if (!hadExistingSummary) {
      setLoadingSummary(true);
    }

    setInitialSummaryError(null);
    setSummaryWarning(null);

    const result = await fetchDashboardSummary({
      cacheKey: dashboardCacheKey,
      previousSummary: summaryRef.current,
      token,
      userRole,
    });

    if (result.fulfilled || hadExistingSummary) {
      applySummary(result.summary);

      if (result.fulfilled) {
        setCachedDashboardSummary(dashboardCacheKey, result.summary);
      }

      hasLoadedSummaryRef.current = true;
      setHasLoadedSummary(true);
    }

    if (result.failed) {
      if (hadExistingSummary || result.fulfilled) {
        setSummaryWarning('Some live dashboard data could not be refreshed.');
      } else {
        setInitialSummaryError('Unable to load Home data. Check your connection and try again.');
      }
    }

    setLoadingSummary(false);
  }, [applySummary, dashboardCacheKey, token, userRole]);

  useEffect(() => {
    if (token && userRole) {
      void loadSummary();
    }
  }, [loadSummary, token, userRole]);

  const currentAlert = useMemo(() => topAlert(alerts), [alerts]);
  const latestIncident = incidents[0] ?? null;
  const nearestShelter = shelters[0] ?? null;
  const unreadCommunityNotifications = communityNotifications.filter((notification) => !notification.isRead).length;
  const initialLoading = loadingSummary && !hasLoadedSummary;
  const refreshing = loadingSummary && hasLoadedSummary;
  const showSummaryWarning = Boolean(summaryWarning) && !refreshing;
  const handleRiskAction = useCallback(() => {
    if (initialLoading || initialSummaryError) {
      return;
    }

    router.push(currentAlert ? '/alerts/risk-level' as Href : '/alerts' as Href);
  }, [currentAlert, initialLoading, initialSummaryError, router]);

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
        {initialLoading ? (
          <View style={styles.initialRiskState}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroEyebrow}>Current Risk Level</Text>
              <ActivityIndicator color={colors.red} />
            </View>
            <View style={styles.skeletonBlock}>
              <View style={[styles.skeletonLine, styles.skeletonTitle]} />
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, styles.skeletonShort]} />
            </View>
          </View>
        ) : initialSummaryError ? (
          <View style={styles.initialRiskState}>
            <Text style={styles.heroEyebrow}>Current Risk Level</Text>
            <Text style={styles.riskErrorTitle}>Home data is unavailable</Text>
            <Text style={styles.riskErrorText}>{initialSummaryError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadSummary()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
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
              onPress={handleRiskAction}
              tone={currentAlert && riskTone(currentAlert.riskLevel) === 'red' ? 'red' : 'navy'}
            />
          </>
        )}
      </SectionCard>

      {showSummaryWarning && summaryWarning ? <DemoNotice text={summaryWarning} /> : null}

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
        {!canPublishAlerts ? (
          <QuickActionCard
            body={unreadCommunityNotifications > 0
              ? `${unreadCommunityNotifications} unread local ${plural(unreadCommunityNotifications, 'update', 'updates')}`
              : 'View road, utility, safety, and public updates'}
            fallback="N"
            name="bell.badge.fill"
            title="Community Notifications"
            tone="blue"
            onPress={() => router.push('/community-notifications' as Href)}
          />
        ) : null}
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
        <SecondaryButton
          title="My Incident Reports"
          onPress={() => router.push('/incidents' as Href)}
        />
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
          <SecondaryButton
            title="Manage Community Notifications"
            onPress={() => router.push('/community-notifications' as Href)}
          />
          <SecondaryButton
            title="Create Community Notification"
            onPress={() => router.push('/community-notifications/create' as Href)}
          />
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
  initialRiskState: {
    gap: spacing.md,
    minHeight: 128,
  },
  skeletonBlock: {
    gap: spacing.sm,
  },
  skeletonLine: {
    backgroundColor: colors.sky,
    borderRadius: radius.xs,
    height: 12,
    width: '92%',
  },
  skeletonTitle: {
    height: 24,
    width: '54%',
  },
  skeletonShort: {
    width: '68%',
  },
  riskErrorTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  riskErrorText: {
    color: colors.muted,
    ...typography.body,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    color: colors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
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
