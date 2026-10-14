import { getActiveAlerts } from '@/services/alertService';
import { getCommunityNotifications } from '@/services/communityNotificationService';
import { getAllIncidents, getMyIncidents } from '@/services/incidentService';
import { getShelters } from '@/services/shelterService';
import type { Alert } from '@/types/alert';
import type { AuthUser } from '@/types/auth';
import type { CommunityNotification } from '@/types/communityNotification';
import type { Incident } from '@/types/incident';
import type { Shelter } from '@/types/shelter';
import { isAuthorityRole } from '@/utils/format';

export type DashboardSummary = {
  alerts: Alert[];
  communityNotifications: CommunityNotification[];
  incidents: Incident[];
  communityIncidents: Incident[];
  shelters: Shelter[];
};

type CachedDashboardSummary = DashboardSummary & {
  cacheKey: string;
  loadedAt: number;
};

type DashboardSummaryResult = {
  failed: boolean;
  fulfilled: boolean;
  summary: DashboardSummary;
};

let cachedDashboardSummary: CachedDashboardSummary | null = null;
const inFlightSummaries = new Map<string, Promise<DashboardSummaryResult>>();

export function emptyDashboardSummary(): DashboardSummary {
  return {
    alerts: [],
    communityNotifications: [],
    incidents: [],
    communityIncidents: [],
    shelters: [],
  };
}

export function dashboardSummaryCacheKey(token: string | null, userId: number | string | null | undefined) {
  return token && userId != null ? `${userId}:${token}` : null;
}

export function getCachedDashboardSummary(cacheKey: string | null) {
  return cacheKey && cachedDashboardSummary?.cacheKey === cacheKey ? cachedDashboardSummary : null;
}

export function setCachedDashboardSummary(cacheKey: string, summary: DashboardSummary) {
  cachedDashboardSummary = {
    ...summary,
    cacheKey,
    loadedAt: Date.now(),
  };
}

export async function fetchDashboardSummary({
  cacheKey,
  previousSummary = emptyDashboardSummary(),
  token,
  userRole,
}: {
  cacheKey: string;
  previousSummary?: DashboardSummary;
  token: string;
  userRole: string;
}) {
  const existingRequest = inFlightSummaries.get(cacheKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = Promise.allSettled([
    getActiveAlerts(token),
    getMyIncidents(token),
    getShelters(token),
    isAuthorityRole(userRole) ? Promise.resolve([]) : getCommunityNotifications(token),
    isAuthorityRole(userRole) ? Promise.resolve([]) : getAllIncidents(token),
  ]).then(([
    alertResult,
    incidentResult,
    shelterResult,
    communityNotificationResult,
    communityIncidentsResult,
  ]): DashboardSummaryResult => {
    const results = [alertResult, incidentResult, shelterResult, communityNotificationResult, communityIncidentsResult];
    const failed = results.some((result) => result.status === 'rejected');
    const fulfilled = results.some((result) => result.status === 'fulfilled');
    const summary: DashboardSummary = {
      alerts: alertResult.status === 'fulfilled' ? alertResult.value : previousSummary.alerts,
      communityNotifications: communityNotificationResult.status === 'fulfilled'
        ? communityNotificationResult.value
        : previousSummary.communityNotifications,
      incidents: incidentResult.status === 'fulfilled' ? incidentResult.value : previousSummary.incidents,
      communityIncidents: communityIncidentsResult.status === 'fulfilled' ? communityIncidentsResult.value : previousSummary.communityIncidents,
      shelters: shelterResult.status === 'fulfilled' ? shelterResult.value : previousSummary.shelters,
    };

    if (fulfilled) {
      setCachedDashboardSummary(cacheKey, summary);
    }

    return {
      failed,
      fulfilled,
      summary,
    };
  }).finally(() => {
    inFlightSummaries.delete(cacheKey);
  });

  inFlightSummaries.set(cacheKey, request);

  return request;
}

export async function prefetchDashboardSummary(token: string, user: AuthUser) {
  const cacheKey = dashboardSummaryCacheKey(token, user.id);

  if (!cacheKey) {
    return null;
  }

  const result = await fetchDashboardSummary({
    cacheKey,
    token,
    userRole: user.role,
  });

  return result.fulfilled ? result.summary : null;
}
