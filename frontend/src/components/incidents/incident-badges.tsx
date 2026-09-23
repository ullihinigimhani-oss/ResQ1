import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import type {
  IncidentSeverity,
  IncidentStatus,
} from '@/types/incident';

type TrackerStageState = 'completed' | 'current' | 'pending';

const severityStyles: Record<IncidentSeverity, { backgroundColor: string; borderColor: string; color: string }> = {
  Low: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.blueBorder,
    color: BrandColors.deepBlue,
  },
  Medium: {
    backgroundColor: BrandColors.warningSoft,
    borderColor: BrandColors.warningBorderStrong,
    color: BrandColors.warningText,
  },
  High: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.redBorder,
    color: BrandColors.red,
  },
  Critical: {
    backgroundColor: BrandColors.criticalBackground,
    borderColor: BrandColors.criticalBorder,
    color: BrandColors.criticalText,
  },
};

const statusStyles: Record<IncidentStatus, { backgroundColor: string; borderColor: string; color: string }> = {
  Reported: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.blueBorder,
    color: BrandColors.deepBlue,
  },
  'Under Review': {
    backgroundColor: BrandColors.warningSoft,
    borderColor: BrandColors.warningBorderStrong,
    color: BrandColors.warningText,
  },
  Verified: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.successBorder,
    color: BrandColors.success,
  },
  Rejected: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.redBorder,
    color: BrandColors.red,
  },
};

const fallbackStatusTone = {
  backgroundColor: BrandColors.incidentSoft,
  borderColor: BrandColors.border,
  color: BrandColors.muted,
};

const currentStageAccent: Record<IncidentStatus, {
  dot: string;
  title: string;
  badgeBackground: string;
  badgeBorder: string;
  badgeText: string;
}> = {
  Reported: {
    dot: BrandColors.blueBorder,
    title: BrandColors.deepBlue,
    badgeBackground: BrandColors.lightBlue,
    badgeBorder: BrandColors.blueBorder,
    badgeText: BrandColors.deepBlue,
  },
  'Under Review': {
    dot: BrandColors.warningBorderStrong,
    title: BrandColors.warningText,
    badgeBackground: BrandColors.warningSoft,
    badgeBorder: BrandColors.warningBorderStrong,
    badgeText: BrandColors.warningText,
  },
  Verified: {
    dot: BrandColors.successBorder,
    title: BrandColors.success,
    badgeBackground: BrandColors.successSoft,
    badgeBorder: BrandColors.successBorder,
    badgeText: BrandColors.success,
  },
  Rejected: {
    dot: BrandColors.redBorder,
    title: BrandColors.red,
    badgeBackground: BrandColors.redSoft,
    badgeBorder: BrandColors.redBorder,
    badgeText: BrandColors.red,
  },
};

const timelineStages: {
  label: string;
  statuses: IncidentStatus[];
  description: string;
}[] = [
  {
    label: 'Reported',
    statuses: ['Reported'],
    description: 'Your incident report has been received.',
  },
  {
    label: 'Under Review',
    statuses: ['Under Review'],
    description: 'Authorities are reviewing the submitted information.',
  },
  {
    label: 'Resolution',
    statuses: ['Verified', 'Rejected'],
    description: 'Your report will be given a final outcome once reviewed.',
  },
];

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const tone = severityStyles[severity];

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{severity}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const tone = statusStyles[status] ?? fallbackStatusTone;

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{status}</Text>
    </View>
  );
}

export function StatusTimeline({ currentStatus }: { currentStatus: IncidentStatus }) {
  const currentIndex = Math.max(0, timelineStages.findIndex((stage) => stage.statuses.includes(currentStatus)));
  const terminalReached = currentIndex === timelineStages.length - 1;
  const terminalStage = terminalReached && currentStatus === 'Rejected'
    ? { label: 'Rejected', description: 'Your report has been reviewed and rejected as invalid.' }
    : terminalReached
      ? { label: 'Verified', description: 'Your report has been verified as a confirmed incident.' }
      : { label: 'Resolution', description: 'Your report will be given a final outcome once reviewed.' };
  const stages = timelineStages.map((stage, index) =>
    index < timelineStages.length - 1
      ? stage
      : { ...stage, label: terminalStage.label, description: terminalStage.description },
  );

  return (
    <View style={styles.timeline}>
      {stages.map((stage, index) => {
        const state: TrackerStageState = index < currentIndex
          ? 'completed'
          : index === currentIndex
            ? 'current'
            : 'pending';
        const completed = state === 'completed';
        const current = index === currentIndex;
        const pending = state === 'pending';
        const accent = currentStageAccent[currentStatus];

        return (
          <View key={stage.label} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View
                style={[
                  styles.timelineDot,
                  completed && styles.timelineDotCompleted,
                  current && [styles.timelineDotCurrent, { borderColor: accent.dot }],
                  pending && styles.timelineDotPending,
                ]}>
                {completed ? <View style={styles.timelineDotCenter} /> : null}
              </View>
              {index < timelineStages.length - 1 ? (
                <View style={[styles.timelineLine, index < currentIndex && styles.timelineLineActive]} />
              ) : null}
            </View>
            <View style={styles.timelineTextBlock}>
              <View style={styles.timelineTitleRow}>
                <Text
                  style={[
                    styles.timelineTitle,
                    !pending && styles.timelineTitleActive,
                    current && [styles.timelineTitleCurrent, { color: accent.title }],
                  ]}>
                  {stage.label}
                </Text>
                <View
                  style={[
                    styles.stageBadge,
                    completed && styles.stageBadgeCompleted,
                    current
                      ? [
                          styles.stageBadgeCurrent,
                          {
                            backgroundColor: accent.badgeBackground,
                            borderColor: accent.badgeBorder,
                          },
                        ]
                      : null,
                    pending && styles.stageBadgePending,
                  ]}>
                  <Text
                    style={[
                      styles.stageBadgeText,
                      completed && styles.stageBadgeTextCompleted,
                      current && [styles.stageBadgeTextCurrent, { color: accent.badgeText }],
                      pending && styles.stageBadgeTextPending,
                    ]}>
                    {completed ? 'Completed' : current ? 'Current' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.timelineCopy, pending && styles.timelineCopyPending]}>
                {stage.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  timelineRail: {
    alignItems: 'center',
    marginRight: 14,
    width: 24,
  },
  timelineDot: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  timelineDotCompleted: {
    backgroundColor: BrandColors.accentAction,
    borderColor: BrandColors.accentAction,
  },
  timelineDotCurrent: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.red,
    borderWidth: 4,
  },
  timelineDotPending: {
    backgroundColor: BrandColors.white,
  },
  timelineDotCenter: {
    backgroundColor: BrandColors.white,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  timelineLine: {
    backgroundColor: BrandColors.border,
    flex: 1,
    marginTop: 3,
    width: 2,
  },
  timelineLineActive: {
    backgroundColor: BrandColors.accentAction,
  },
  timelineTextBlock: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timelineTitle: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  timelineTitleActive: {
    color: BrandColors.navy,
  },
  timelineTitleCurrent: {
    color: BrandColors.red,
  },
  timelineCopy: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
  },
  timelineCopyPending: {
    color: BrandColors.muted,
  },
  stageBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageBadgeCompleted: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.blue,
  },
  stageBadgeCurrent: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
  },
  stageBadgePending: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  stageBadgeTextCompleted: {
    color: BrandColors.deepBlue,
  },
  stageBadgeTextCurrent: {
    color: BrandColors.red,
  },
  stageBadgeTextPending: {
    color: BrandColors.muted,
  },
});
