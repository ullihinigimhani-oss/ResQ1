import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import communitySafetyImage from '@/assets/images/community-safety.png';
import preparednessImage from '@/assets/images/emergency-preparedness.png';
import residentHeroImage from '@/assets/images/resident-hero.png';
import {
  AppIcon,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, shadows, spacing, typography } from '@/constants/design';
import type { DashboardSummary } from '@/services/dashboardSummaryService';
import type { Alert, AlertRiskLevel } from '@/types/alert';
import type { AuthUser } from '@/types/auth';
import type { CommunityNotification } from '@/types/communityNotification';
import { getCurrentRiskAlert } from '@/utils/alert-risk';
import { firstName, formatDateTime, initials, preview, userArea } from '@/utils/format';

type ResidentHomeProps = {
  alerts: DashboardSummary['alerts'];
  communityNotifications: DashboardSummary['communityNotifications'];
  initialError: string | null;
  loading: boolean;
  onRetry: () => Promise<void>;
  refreshing: boolean;
  summaryWarning: string | null;
  user: AuthUser;
};

type LatestUpdate =
  | { kind: 'alert'; value: Alert }
  | { kind: 'community'; value: CommunityNotification };

const preparednessTips = [
  {
    number: '01',
    title: 'Pack essentials',
    body: 'Keep water, medicine, a torch, and key documents ready.',
  },
  {
    number: '02',
    title: 'Save key numbers',
    body: 'Keep trusted family and emergency contacts easy to reach.',
  },
  {
    number: '03',
    title: 'Follow guidance',
    body: 'Use verified alerts and follow official evacuation instructions.',
  },
] as const;

function riskTone(riskLevel: AlertRiskLevel | string | null) {
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    return 'red' as const;
  }

  if (riskLevel === 'Moderate') {
    return 'amber' as const;
  }

  if (riskLevel === 'Low') {
    return 'blue' as const;
  }

  return 'green' as const;
}

function riskAccent(riskLevel: AlertRiskLevel | string | null) {
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    return colors.red;
  }

  if (riskLevel === 'Moderate') {
    return colors.amber;
  }

  if (riskLevel === 'Low') {
    return colors.blue;
  }

  return colors.success;
}

function timestamp(value: string) {
  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestCommunityNotification(notifications: CommunityNotification[]) {
  return [...notifications].sort(
    (left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt),
  )[0] ?? null;
}

function communityCategory(category: CommunityNotification['category']) {
  return category
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function Header({ user }: { user: AuthUser }) {
  const router = useRouter();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.greeting}>{greeting}, {firstName(user.fullName)}</Text>
        <Text style={styles.headerSubtitle}>Stay informed. Stay prepared.</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel="Open alert preferences"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/alerts/preferences' as Href)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <AppIcon fallback="N" name="bell.fill" size={20} tintColor={colors.deepBlue} />
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

function SafetyStatus({
  alerts,
  initialError,
  loading,
  onRetry,
  refreshing,
  user,
}: Pick<
  ResidentHomeProps,
  'alerts' | 'initialError' | 'loading' | 'onRetry' | 'refreshing' | 'user'
>) {
  const currentAlert = useMemo(() => getCurrentRiskAlert(alerts), [alerts]);
  const accent = riskAccent(currentAlert?.riskLevel ?? null);

  return (
    <View style={styles.statusCard}>
      <View style={styles.sectionHeadingRow}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>Your area</Text>
          <Text style={styles.sectionTitle}>Current Safety Status</Text>
        </View>
        {refreshing ? <ActivityIndicator color={colors.blue} size="small" /> : null}
      </View>

      {loading ? (
        <View style={styles.statusState}>
          <ActivityIndicator color={colors.blue} />
          <Text style={styles.statusStateText}>Checking verified alerts for your area...</Text>
        </View>
      ) : initialError ? (
        <View style={styles.statusState}>
          <View style={[styles.statusDot, { backgroundColor: colors.muted }]} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Safety status unavailable</Text>
            <Text style={styles.statusBody}>We could not confirm the latest area status.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onRetry()}
            style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
            <Text style={styles.textButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.statusState}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>
              {currentAlert ? `${currentAlert.riskLevel} alert in your area` : 'No active alerts in your area'}
            </Text>
            <Text style={styles.statusBody}>
              {currentAlert
                ? currentAlert.title
                : user.location
                  ? `${user.location} has no active emergency alert at this time.`
                  : 'No active emergency alert is available for your account at this time.'}
            </Text>
            <View style={styles.statusMetaRow}>
              <StatusBadge
                label={currentAlert ? currentAlert.riskLevel : 'All clear'}
                tone={riskTone(currentAlert?.riskLevel ?? null)}
              />
              <Text numberOfLines={1} style={styles.statusMeta}>{userArea(user)}</Text>
              {currentAlert ? (
                <Text style={styles.statusMeta}>Updated {formatDateTime(currentAlert.updatedAt)}</Text>
              ) : null}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function UpdatePreview({ update }: { update: LatestUpdate | null }) {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadingRow}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>Verified information</Text>
          <Text style={styles.sectionTitle}>Latest Updates</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/alerts' as Href)}
          style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}>
          <Text style={styles.viewAllLabel}>View all</Text>
          <Text style={styles.viewAllArrow}>{'>'}</Text>
        </Pressable>
      </View>

      {update ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (update.kind === 'alert') {
              router.push({
                pathname: '/alerts/[id]',
                params: { id: String(update.value.id) },
              } as unknown as Href);
              return;
            }

            router.push({
              pathname: '/community-notifications/[id]',
              params: { id: String(update.value.id) },
            } as unknown as Href);
          }}
          style={({ pressed }) => [styles.updateCard, pressed && styles.pressed]}>
          <View style={styles.updateIcon}>
            <AppIcon
              fallback={update.kind === 'alert' ? '!' : 'N'}
              name={update.kind === 'alert' ? 'exclamationmark.triangle.fill' : 'bell.fill'}
              size={22}
              tintColor={update.kind === 'alert' ? colors.red : colors.deepBlue}
            />
          </View>
          <View style={styles.updateCopy}>
            <View style={styles.updateTitleRow}>
              <Text numberOfLines={2} style={styles.updateTitle}>{update.value.title}</Text>
              <StatusBadge
                label={update.kind === 'alert' ? update.value.riskLevel : communityCategory(update.value.category)}
                tone={update.kind === 'alert' ? riskTone(update.value.riskLevel) : 'blue'}
              />
            </View>
            <Text style={styles.updateBody} numberOfLines={2}>
              {update.kind === 'alert'
                ? preview(update.value.message, 120)
                : preview(update.value.message, 120)}
            </Text>
            <View style={styles.updateMetaRow}>
              <Text numberOfLines={1} style={styles.updateMeta}>
                {update.kind === 'alert' ? update.value.affectedArea : update.value.targetArea}
              </Text>
              <View style={styles.metaSeparator} />
              <Text style={styles.updateMeta}>{formatDateTime(update.value.updatedAt)}</Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyUpdate}>
          <View style={styles.emptyUpdateIcon}>
            <AppIcon fallback="OK" name="house.fill" size={21} tintColor={colors.success} />
          </View>
          <View style={styles.updateCopy}>
            <Text style={styles.emptyUpdateTitle}>No new updates</Text>
            <Text style={styles.updateBody}>There are no active alerts or community notices to show.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function PreparednessSection({ wideLayout }: { wideLayout: boolean }) {
  return (
    <View style={[styles.visualSection, wideLayout && styles.visualSectionWide]}>
      <View style={styles.visualHeading}>
        <Text style={styles.sectionEyebrow}>Everyday readiness</Text>
        <Text style={styles.sectionTitle}>Be Prepared</Text>
      </View>
      <View style={styles.supportingImageFrame}>
        <Image
          accessibilityLabel="Emergency preparedness supplies arranged for a Sri Lankan household"
          contentFit="cover"
          source={preparednessImage}
          style={styles.supportingImage}
        />
      </View>
      <Text style={styles.visualBody}>Keep your emergency essentials ready before a disaster occurs.</Text>
      <View style={styles.tipsList}>
        {preparednessTips.map((tip) => (
          <View key={tip.number} style={styles.tipRow}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>{tip.number}</Text>
            </View>
            <View style={styles.tipCopy}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CommunitySection({ wideLayout }: { wideLayout: boolean }) {
  return (
    <View style={[styles.visualSection, wideLayout && styles.visualSectionWide]}>
      <View style={styles.visualHeading}>
        <Text style={styles.sectionEyebrow}>Community resilience</Text>
        <Text style={styles.sectionTitle}>Safer Together</Text>
      </View>
      <View style={styles.supportingImageFrame}>
        <Image
          accessibilityLabel="Sri Lankan neighbors supporting each other after flooding"
          contentFit="cover"
          source={communitySafetyImage}
          style={styles.supportingImage}
        />
      </View>
      <Text style={styles.visualBody}>Prepared communities can respond faster and recover stronger.</Text>
      <View style={styles.communityNote}>
        <AppIcon fallback="C" name="person.3.fill" size={22} tintColor={colors.success} />
        <Text style={styles.communityNoteText}>
          Check on family and neighbors when an official warning affects your area.
        </Text>
      </View>
    </View>
  );
}

function EmergencyHelp() {
  const router = useRouter();

  return (
    <View style={styles.helpCard}>
      <View style={styles.helpIcon}>
        <AppIcon fallback="!" name="cross.case.fill" size={24} tintColor={colors.red} />
      </View>
      <View style={styles.helpCopy}>
        <Text style={styles.helpTitle}>Need urgent help?</Text>
        <Text style={styles.helpBody}>Prepare a request with your location and immediate needs.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/assistance' as Href)}
        style={({ pressed }) => [styles.helpAction, pressed && styles.pressed]}>
        <Text style={styles.helpActionText}>Request help</Text>
      </Pressable>
    </View>
  );
}

export function ResidentHome({
  alerts,
  communityNotifications,
  initialError,
  loading,
  onRetry,
  refreshing,
  summaryWarning,
  user,
}: ResidentHomeProps) {
  const { width } = useWindowDimensions();
  const wideLayout = width >= 760;
  const contentWidth = Math.min(Math.max(width - spacing.xl * 2, 280), 920);
  const heroHeight = Math.min(380, contentWidth / 1.5);
  const currentAlert = useMemo(() => getCurrentRiskAlert(alerts), [alerts]);
  const communityUpdate = useMemo(
    () => latestCommunityNotification(communityNotifications),
    [communityNotifications],
  );
  const latestUpdate = currentAlert
    ? { kind: 'alert' as const, value: currentAlert }
    : communityUpdate
      ? { kind: 'community' as const, value: communityUpdate }
      : null;

  return (
    <ScreenContainer>
      <View style={styles.page}>
        <Header user={user} />

        <View style={[styles.heroFrame, { height: heroHeight }]}>
          <Image
            accessibilityLabel="A Sri Lankan family overlooking a prepared and resilient community"
            contentFit="cover"
            source={residentHeroImage}
            style={styles.heroImage}
          />
        </View>

        <SafetyStatus
          alerts={alerts}
          initialError={initialError}
          loading={loading}
          onRetry={onRetry}
          refreshing={refreshing}
          user={user}
        />

        {summaryWarning ? (
          <View style={styles.warningBanner}>
            <View style={styles.warningDot} />
            <Text style={styles.warningText}>{summaryWarning}</Text>
          </View>
        ) : null}

        {!loading && !initialError ? <UpdatePreview update={latestUpdate} /> : null}

        <View style={[styles.visualGrid, wideLayout && styles.visualGridWide]}>
          <PreparednessSection wideLayout={wideLayout} />
          <CommunitySection wideLayout={wideLayout} />
        </View>

        <EmergencyHelp />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: 920,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 52,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
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
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: colors.deepBlue,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  heroFrame: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    ...shadows.card,
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  statusCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sectionHeadingCopy: {
    flex: 1,
    gap: 2,
  },
  sectionEyebrow: {
    color: colors.success,
    ...typography.label,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.navy,
    ...typography.sectionTitle,
  },
  statusState: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusStateText: {
    color: colors.muted,
    flex: 1,
    ...typography.body,
  },
  statusDot: {
    borderRadius: 6,
    height: 12,
    marginTop: 5,
    width: 12,
  },
  statusCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  statusTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  statusBody: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  statusMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusMeta: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  textButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  textButtonLabel: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
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
  viewAllButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingLeft: spacing.sm,
  },
  viewAllLabel: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  viewAllArrow: {
    color: colors.deepBlue,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
  },
  updateCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  updateIcon: {
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  updateCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  updateTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  updateTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
    minWidth: 160,
  },
  updateBody: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  updateMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  updateMeta: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  metaSeparator: {
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  emptyUpdate: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyUpdateIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  emptyUpdateTitle: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  visualGrid: {
    gap: spacing.xl,
  },
  visualGridWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  visualSection: {
    gap: spacing.md,
    minWidth: 0,
    width: '100%',
  },
  visualSectionWide: {
    flex: 1,
    width: 'auto',
  },
  visualHeading: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 2,
    minHeight: 44,
  },
  supportingImageFrame: {
    aspectRatio: 1.5,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    ...shadows.card,
  },
  supportingImage: {
    height: '100%',
    width: '100%',
  },
  visualBody: {
    color: colors.text,
    ...typography.body,
  },
  tipsList: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tipRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  tipNumber: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderRadius: radius.sm,
    height: 30,
    justifyContent: 'center',
    width: 34,
  },
  tipNumberText: {
    color: colors.deepBlue,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  tipCopy: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  tipBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  communityNote: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  communityNoteText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  helpCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  helpIcon: {
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  helpCopy: {
    flex: 1,
    gap: 2,
    minWidth: 180,
  },
  helpTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  helpBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  helpAction: {
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  helpActionText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
});
