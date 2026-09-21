import { Redirect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

import { AuthorityDashboard } from '@/components/dashboard/authority-dashboard';
import { ResidentHome as ResidentDashboard } from '@/components/dashboard/resident-home';
import { LoadingState, ScreenContainer, SectionCard } from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';
import {
  dashboardSummaryCacheKey,
  emptyDashboardSummary,
  fetchDashboardSummary,
  getCachedDashboardSummary,
  setCachedDashboardSummary,
  type DashboardSummary,
} from '@/services/dashboardSummaryService';
import { isAuthorityRole, normalize } from '@/utils/format';

export default function DashboardScreen() {
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
        setInitialSummaryError('Unable to load dashboard data. Check your connection and try again.');
      }
    }

    setLoadingSummary(false);
  }, [applySummary, dashboardCacheKey, token, userRole]);

  useEffect(() => {
    if (token && userRole) {
      void loadSummary();
    }
  }, [loadSummary, token, userRole]);

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

  const normalizedRole = normalize(user.role);
  const initialLoading = loadingSummary && !hasLoadedSummary;
  const refreshing = loadingSummary && hasLoadedSummary;
  const visibleSummaryWarning = Boolean(summaryWarning) && !refreshing ? summaryWarning : null;

  if (normalizedRole === 'resident') {
    return (
      <ResidentDashboard
        alerts={alerts}
        communityNotifications={communityNotifications}
        initialError={initialSummaryError}
        loading={initialLoading}
        onRetry={loadSummary}
        refreshing={refreshing}
        summaryWarning={visibleSummaryWarning}
        user={user}
      />
    );
  }

  if (isAuthorityRole(normalizedRole)) {
    return (
      <AuthorityDashboard
        alerts={alerts}
        incidents={incidents}
        initialError={initialSummaryError}
        loading={initialLoading}
        onRetry={loadSummary}
        refreshing={refreshing}
        shelters={shelters}
        summaryWarning={visibleSummaryWarning}
        user={user}
      />
    );
  }

  return (
    <ScreenContainer bottomNav={false}>
      <SectionCard title="Dashboard unavailable">
        <Text>Your account role could not be recognized. Please sign out and log in again.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
