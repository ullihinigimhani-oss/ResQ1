import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppIcon, ScreenContainer, StatusBadge, ThemeToggleButton } from '@/components/ui/app-components';
import { colors, radius, shadows, spacing, typography } from '@/constants/design';
import type { DashboardSummary } from '@/services/dashboardSummaryService';
import type { AuthUser } from '@/types/auth';
import { incidentStatusWorkflow, type Incident } from '@/types/incident';
import type { Shelter } from '@/types/shelter';
import { firstName, formatDateTime, initials, normalize } from '@/utils/format';

type AuthorityDashboardProps = {
  alerts: DashboardSummary['alerts'];
  incidents: DashboardSummary['incidents'];
  initialError: string | null;
  loading: boolean;
  onRetry: () => Promise<void>;
  refreshing: boolean;
  shelters: DashboardSummary['shelters'];
  summaryWarning: string | null;
  user: AuthUser;
};

type BadgeTone = 'amber' | 'blue' | 'green' | 'muted' | 'red';

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

function severityTone(value: string): BadgeTone {
  const normalizedValue = normalize(value);

  if (normalizedValue === 'critical') {
    return 'red';
  }

  if (normalizedValue === 'high' || normalizedValue === 'moderate' || normalizedValue === 'medium') {
    return 'amber';
  }

  return normalizedValue === 'low' ? 'green' : 'blue';
}

function statusTone(value: string): BadgeTone {
  const normalizedValue = normalize(value);

  if (normalizedValue === 'resolved' || normalizedValue === 'verified' || normalizedValue === 'open') {
    return 'green';
  }

  if (normalizedValue === 'rejected' || normalizedValue === 'closed' || normalizedValue === 'full') {
    return 'red';
  }

  if (
    normalizedValue === 'reported'
    || normalizedValue === 'under review'
    || normalizedValue === 'limited'
  ) {
    return 'amber';
  }

  return normalizedValue === 'in progress' || normalizedValue === 'active' ? 'blue' : 'muted';
}

function activeIncident(incident: Incident) {
  return incident.status !== 'Resolved' && incident.status !== 'Rejected';
}

function openShelter(shelter: Shelter) {
  return normalize(shelter.status) === 'open';
}

function Header({ user }: Pick<AuthorityDashboardProps, 'user'>) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.headerEyebrow}>Operations center</Text>
        <Text style={styles.headerTitle}>Authority Dashboard</Text>
        <Text style={styles.headerGreeting}>{greeting()}, {firstName(user.fullName)}</Text>
        <Text style={styles.headerSubtitle}>Disaster Response Overview</Text>
      </View>

      <View style={styles.headerActions}>
        <ThemeToggleButton size={42} />
        <Pressable
          accessibilityLabel="Open emergency alerts"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/alerts' as Href)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <AppIcon fallback="A" name="bell.fill" size={20} tintColor={colors.deepBlue} />
        </Pressable>
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/profile' as Href)}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
          <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryCard({
  accent,
  caption,
  fallback,
  icon,
  label,
  value,
  wide,
}: {
  accent: string;
  caption: string;
  fallback: string;
  icon: string;
  label: string;
  value: string;
  wide: boolean;
}) {
  return (
    <View style={[styles.summaryCard, wide && styles.summaryCardWide]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${accent}14` }]}>
        <AppIcon fallback={fallback} name={icon} size={21} tintColor={accent} />
      </View>
      <Text numberOfLines={2} style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, value.length > 3 && styles.summaryValueCompact]}>{value}</Text>
      <Text numberOfLines={2} style={styles.summaryCaption}>{caption}</Text>
    </View>
  );
}

function PanelHeader({
  action,
  onAction,
  subtitle,
  title,
}: {
  action?: string;
  onAction?: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.panelHeader}>
      <View style={styles.panelHeading}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.panelSubtitle}>{subtitle}</Text>
      </View>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
          <Text style={styles.textActionLabel}>{action}</Text>
          <Text style={styles.textActionArrow}>{'>'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <View style={styles.stateRow}>
      <ActivityIndicator color={colors.blue} size="small" />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

function EmptyRows({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function AssistancePanel() {
  return (
    <View style={[styles.panel, styles.assistancePanel]}>
      <PanelHeader
        subtitle="Resident emergency support queue"
        title="Assistance Requests Requiring Attention"
      />
      <View style={styles.assistanceState}>
        <View style={styles.assistanceIcon}>
          <AppIcon fallback="+" name="cross.case.fill" size={23} tintColor={colors.amber} />
        </View>
        <View style={styles.assistanceCopy}>
          <Text style={styles.assistanceTitle}>Request data is unavailable</Text>
          <Text style={styles.assistanceBody}>
            No assistance request data is available from the server, so no pending count or request details are shown.
          </Text>
        </View>
      </View>
    </View>
  );
}

function IncidentRow({ incident, last }: { incident: Incident; last: boolean }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel={`Open incident ${incident.title}`}
      accessibilityRole="button"
      onPress={() => router.push({
        pathname: '/incidents/[id]',
        params: { id: String(incident.id) },
      } as unknown as Href)}
      style={({ pressed }) => [styles.listRow, last && styles.listRowLast, pressed && styles.rowPressed]}>
      <View style={styles.listAccent} />
      <View style={styles.listContent}>
        <View style={styles.listTitleRow}>
          <View style={styles.listTitleCopy}>
            <Text numberOfLines={1} style={styles.listEyebrow}>{incident.incidentType}</Text>
            <Text numberOfLines={1} style={styles.listTitle}>{incident.title}</Text>
          </View>
          <StatusBadge label={incident.severity} tone={severityTone(incident.severity)} />
        </View>
        <Text numberOfLines={1} style={styles.listLocation}>{incident.location}</Text>
        <View style={styles.listMetaRow}>
          <StatusBadge label={incident.status} tone={statusTone(incident.status)} />
          <Text style={styles.listTime}>{formatDateTime(incident.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function IncidentPanel({ incidents, loading }: Pick<AuthorityDashboardProps, 'incidents' | 'loading'>) {
  const router = useRouter();
  const recentIncidents = incidents.slice(0, 4);

  return (
    <View style={styles.panel}>
      <PanelHeader
        action="View All"
        onAction={() => router.push('/incidents' as Href)}
        subtitle="Latest reports submitted by residents"
        title="Recent Incident Reports"
      />
      {loading ? <LoadingRows label="Loading incident reports..." /> : null}
      {!loading && recentIncidents.length === 0 ? (
        <EmptyRows body="New resident reports will appear here." title="No incident reports" />
      ) : null}
      {!loading ? recentIncidents.map((incident, index) => (
        <IncidentRow
          incident={incident}
          key={incident.id}
          last={index === recentIncidents.length - 1}
        />
      )) : null}
    </View>
  );
}

function AlertPanel({ alerts, loading }: Pick<AuthorityDashboardProps, 'alerts' | 'loading'>) {
  const router = useRouter();
  const activeAlerts = alerts.slice(0, 3);

  return (
    <View style={styles.panel}>
      <PanelHeader
        action="View All"
        onAction={() => router.push('/alerts' as Href)}
        subtitle="Current official warnings"
        title="Active Alerts"
      />
      {loading ? <LoadingRows label="Loading active alerts..." /> : null}
      {!loading && activeAlerts.length === 0 ? (
        <EmptyRows body="No official alerts are active right now." title="No active alerts" />
      ) : null}
      {!loading ? activeAlerts.map((alert, index) => (
        <Pressable
          accessibilityLabel={`Open alert ${alert.title}`}
          accessibilityRole="button"
          key={alert.id}
          onPress={() => router.push({
            pathname: '/alerts/[id]',
            params: { id: String(alert.id) },
          } as unknown as Href)}
          style={({ pressed }) => [
            styles.listRow,
            index === activeAlerts.length - 1 && styles.listRowLast,
            pressed && styles.rowPressed,
          ]}>
          <View style={[styles.listAccent, { backgroundColor: colors.red }]} />
          <View style={styles.listContent}>
            <View style={styles.listTitleRow}>
              <View style={styles.listTitleCopy}>
                <Text numberOfLines={1} style={styles.listEyebrow}>{alert.disasterType}</Text>
                <Text numberOfLines={1} style={styles.listTitle}>{alert.title}</Text>
              </View>
              <StatusBadge label={alert.riskLevel} tone={severityTone(alert.riskLevel)} />
            </View>
            <Text numberOfLines={1} style={styles.listLocation}>{alert.affectedArea}</Text>
            <View style={styles.listMetaRow}>
              <StatusBadge label={alert.status} tone={statusTone(alert.status)} />
              <Text style={styles.listTime}>Updated {formatDateTime(alert.updatedAt)}</Text>
            </View>
          </View>
        </Pressable>
      )) : null}
    </View>
  );
}

function shelterOccupancy(shelter: Shelter) {
  if (shelter.capacity === null || shelter.capacity <= 0 || shelter.currentOccupancy === null) {
    return null;
  }

  return Math.min(Math.max(Math.round((shelter.currentOccupancy / shelter.capacity) * 100), 0), 100);
}

function ShelterPanel({ loading, shelters }: Pick<AuthorityDashboardProps, 'loading' | 'shelters'>) {
  const router = useRouter();
  const visibleShelters = shelters.slice(0, 3);
  const statusCounts = ['Open', 'Limited', 'Full'].map((status) => ({
    count: shelters.filter((shelter) => normalize(shelter.status) === normalize(status)).length,
    status,
  }));

  return (
    <View style={styles.panel}>
      <PanelHeader
        action="View All"
        onAction={() => router.push('/shelters' as Href)}
        subtitle="Capacity across registered safe shelters"
        title="Shelter Status"
      />
      {!loading ? (
        <View style={styles.shelterTotals}>
          {statusCounts.map(({ count, status }) => (
            <View key={status} style={styles.shelterTotal}>
              <View style={[styles.shelterTotalDot, {
                backgroundColor: status === 'Open'
                  ? colors.success
                  : status === 'Limited'
                    ? colors.amber
                    : colors.red,
              }]} />
              <Text style={styles.shelterTotalValue}>{count}</Text>
              <Text style={styles.shelterTotalLabel}>{status}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {loading ? <LoadingRows label="Loading shelter status..." /> : null}
      {!loading && visibleShelters.length === 0 ? (
        <EmptyRows body="No shelter status data is available." title="No shelters available" />
      ) : null}
      {!loading ? visibleShelters.map((shelter, index) => {
        const occupancy = shelterOccupancy(shelter);

        return (
          <Pressable
            accessibilityLabel={`Open shelter ${shelter.name}`}
            accessibilityRole="button"
            key={shelter.id}
            onPress={() => router.push({
              pathname: '/shelters/[id]',
              params: { id: String(shelter.id) },
            } as unknown as Href)}
            style={({ pressed }) => [
              styles.shelterRow,
              index === visibleShelters.length - 1 && styles.listRowLast,
              pressed && styles.rowPressed,
            ]}>
            <View style={styles.shelterTitleRow}>
              <View style={styles.listTitleCopy}>
                <Text numberOfLines={1} style={styles.listTitle}>{shelter.name}</Text>
                <Text numberOfLines={1} style={styles.listLocation}>{shelter.area}</Text>
              </View>
              <StatusBadge label={shelter.status} tone={statusTone(shelter.status)} />
            </View>
            <View style={styles.occupancyMeta}>
              <Text style={styles.occupancyLabel}>Occupancy</Text>
              <Text style={styles.occupancyValue}>{occupancy === null ? 'Not available' : `${occupancy}%`}</Text>
            </View>
            <View style={styles.progressTrack}>
              {occupancy !== null ? (
                <View style={[
                  styles.progressFill,
                  { width: `${occupancy}%` as DimensionValue },
                  occupancy >= 90 && styles.progressFillCritical,
                  occupancy >= 70 && occupancy < 90 && styles.progressFillWarning,
                ]} />
              ) : null}
            </View>
          </Pressable>
        );
      }) : null}
    </View>
  );
}

function IncidentStatusPanel({ incidents, loading }: Pick<AuthorityDashboardProps, 'incidents' | 'loading'>) {
  const breakdown = useMemo(() => incidentStatusWorkflow.map((status) => ({
    count: incidents.filter((incident) => incident.status === status).length,
    status,
  })), [incidents]);
  const largestCount = Math.max(...breakdown.map(({ count }) => count), 1);

  return (
    <View style={styles.panel}>
      <PanelHeader
        subtitle="Current incident workflow distribution"
        title="Incident Status"
      />
      {loading ? <LoadingRows label="Calculating incident status..." /> : null}
      {!loading && incidents.length === 0 ? (
        <EmptyRows body="Status distribution will appear when reports are available." title="No status data" />
      ) : null}
      {!loading && incidents.length > 0 ? (
        <View style={styles.workflowList}>
          {breakdown.map(({ count, status }) => {
            const width = Math.round((count / largestCount) * 100);

            return (
              <View key={status} style={styles.workflowRow}>
                <View style={styles.workflowLabelRow}>
                  <Text style={styles.workflowLabel}>{status}</Text>
                  <Text style={styles.workflowCount}>{count}</Text>
                </View>
                <View style={styles.workflowTrack}>
                  <View style={[
                    styles.workflowFill,
                    { width: `${width}%` as DimensionValue },
                    status === 'Resolved' && styles.workflowResolved,
                    status === 'Rejected' && styles.workflowRejected,
                  ]} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function AuthorityDashboard({
  alerts,
  incidents,
  initialError,
  loading,
  onRetry,
  refreshing,
  shelters,
  summaryWarning,
  user,
}: AuthorityDashboardProps) {
  const { width } = useWindowDimensions();
  const wideLayout = width >= 760;
  const activeIncidentCount = incidents.filter(activeIncident).length;
  const openShelterCount = shelters.filter(openShelter).length;

  return (
    <ScreenContainer>
      <View style={styles.page}>
        <Header user={user} />

        {initialError ? (
          <View style={styles.errorBanner}>
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Operational data is unavailable</Text>
              <Text style={styles.errorBody}>{initialError}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void onRetry()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {summaryWarning ? (
          <View style={styles.warningBanner}>
            <View style={styles.warningDot} />
            <Text style={styles.warningText}>{summaryWarning}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeadingBlock}>
          <Text style={styles.sectionEyebrow}>Live operations</Text>
          <Text style={styles.sectionTitle}>Situation Overview</Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            accent={colors.orange}
            caption="Requiring response"
            fallback="I"
            icon="exclamationmark.triangle.fill"
            label="Active Incidents"
            value={loading ? '—' : String(activeIncidentCount)}
            wide={wideLayout}
          />
          <SummaryCard
            accent={colors.red}
            caption="Official warnings"
            fallback="A"
            icon="bell.fill"
            label="Active Alerts"
            value={loading ? '—' : String(alerts.length)}
            wide={wideLayout}
          />
          <SummaryCard
            accent={colors.amber}
            caption="Data unavailable"
            fallback="+"
            icon="cross.case.fill"
            label="Pending Assistance Requests"
            value="—"
            wide={wideLayout}
          />
          <SummaryCard
            accent={colors.success}
            caption="Accepting residents"
            fallback="S"
            icon="house.and.flag.fill"
            label="Open Shelters"
            value={loading ? '—' : String(openShelterCount)}
            wide={wideLayout}
          />
        </View>

        <AssistancePanel />
        <IncidentPanel incidents={incidents} loading={loading} />
        <AlertPanel alerts={alerts} loading={loading} />
        <ShelterPanel loading={loading} shelters={shelters} />
        <IncidentStatusPanel incidents={incidents} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: 1040,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 88,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    color: colors.blue,
    ...typography.label,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.navy,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 33,
  },
  headerGreeting: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryAction,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  errorCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  errorTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  errorBody: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: colors.red,
    borderRadius: radius.md,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  warningBanner: {
    alignItems: 'center',
    backgroundColor: colors.amberSoft,
    borderColor: colors.amber,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  warningDot: {
    backgroundColor: colors.amber,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  warningText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  sectionHeadingBlock: {
    gap: spacing.xs,
  },
  sectionEyebrow: {
    color: colors.blue,
    ...typography.label,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.navy,
    ...typography.sectionTitle,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 152,
    padding: spacing.md,
    ...shadows.card,
  },
  summaryCardWide: {
    flexBasis: '22%',
  },
  summaryIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 38,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    minHeight: 32,
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 32,
  },
  summaryValueCompact: {
    fontSize: 20,
    lineHeight: 28,
  },
  summaryCaption: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  panel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  assistancePanel: {
    borderColor: '#E7C66C',
  },
  panelHeader: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  panelHeading: {
    flex: 1,
    gap: 2,
  },
  panelTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  panelSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  textAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  textActionLabel: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
  },
  textActionArrow: {
    color: colors.deepBlue,
    fontSize: 16,
    fontWeight: '900',
  },
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  assistanceState: {
    alignItems: 'center',
    backgroundColor: colors.amberSoft,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  assistanceIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E7C66C',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  assistanceCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  assistanceTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  assistanceBody: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 112,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listAccent: {
    backgroundColor: colors.orange,
    borderRadius: 2,
    width: 4,
  },
  listContent: {
    flex: 1,
    gap: spacing.xs,
  },
  listTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  listTitleCopy: {
    flex: 1,
    gap: 1,
  },
  listEyebrow: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  listTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  listLocation: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  listMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  listTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  shelterTotals: {
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shelterTotal: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  shelterTotalDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  shelterTotalValue: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
  },
  shelterTotalLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  shelterRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    minHeight: 104,
    padding: spacing.lg,
  },
  shelterTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  occupancyMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  occupancyLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  occupancyValue: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xs,
    height: 7,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.success,
    borderRadius: radius.xs,
    height: '100%',
  },
  progressFillWarning: {
    backgroundColor: colors.amber,
  },
  progressFillCritical: {
    backgroundColor: colors.red,
  },
  workflowList: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  workflowRow: {
    gap: spacing.xs,
  },
  workflowLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workflowLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  workflowCount: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
  },
  workflowTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xs,
    height: 8,
    overflow: 'hidden',
  },
  workflowFill: {
    backgroundColor: colors.blue,
    borderRadius: radius.xs,
    height: '100%',
  },
  workflowResolved: {
    backgroundColor: colors.success,
  },
  workflowRejected: {
    backgroundColor: colors.red,
  },
  pressed: {
    opacity: 0.72,
  },
});
