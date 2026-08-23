import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import {
  incidentStatusWorkflow,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/types/incident';

type TrackerStageState = 'completed' | 'current' | 'pending';

const severityStyles: Record<IncidentSeverity, { backgroundColor: string; borderColor: string; color: string }> = {
  Low: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.blue,
    color: BrandColors.deepBlue,
  },
  Medium: {
    backgroundColor: BrandColors.warningSoft,
    borderColor: '#D69E2E',
    color: '#7A4B00',
  },
  High: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
    color: BrandColors.red,
  },
  Critical: {
    backgroundColor: BrandColors.red,
    borderColor: BrandColors.red,
    color: BrandColors.white,
  },
};

const statusStyles: Record<IncidentStatus, { backgroundColor: string; borderColor: string; color: string }> = {
  Reported: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.blue,
    color: BrandColors.deepBlue,
  },
  'Under Review': {
    backgroundColor: BrandColors.warningSoft,
    borderColor: '#D69E2E',
    color: '#7A4B00',
  },
  'In Progress': {
    backgroundColor: '#E8F1FF',
    borderColor: BrandColors.deepBlue,
    color: BrandColors.deepBlue,
  },
  Resolved: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
    color: BrandColors.success,
  },
};

const statusDescriptions: Record<IncidentStatus, string> = {
  Reported: 'Your incident report has been received.',
  'Under Review': 'Authorities are reviewing the submitted information.',
  'In Progress': 'Emergency response action is underway.',
  Resolved: 'The incident has been marked as resolved.',
};

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const tone = severityStyles[severity];

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{severity}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const tone = statusStyles[status];

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{status}</Text>
    </View>
  );
}

export function StatusTimeline({ currentStatus }: { currentStatus: IncidentStatus }) {
  const currentIndex = Math.max(0, incidentStatusWorkflow.indexOf(currentStatus));

  return (
    <View style={styles.timeline}>
      {incidentStatusWorkflow.map((status, index) => {
        const state: TrackerStageState = index < currentIndex
          ? 'completed'
          : index === currentIndex
            ? 'current'
            : 'pending';
        const completed = state === 'completed';
        const current = index === currentIndex;
        const pending = state === 'pending';

        return (
          <View key={status} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View
                style={[
                  styles.timelineDot,
                  completed && styles.timelineDotCompleted,
                  current && styles.timelineDotCurrent,
                  pending && styles.timelineDotPending,
                ]}>
                {completed ? <View style={styles.timelineDotCenter} /> : null}
              </View>
              {index < incidentStatusWorkflow.length - 1 ? (
                <View style={[styles.timelineLine, index < currentIndex && styles.timelineLineActive]} />
              ) : null}
            </View>
            <View style={styles.timelineTextBlock}>
              <View style={styles.timelineTitleRow}>
                <Text
                  style={[
                    styles.timelineTitle,
                    !pending && styles.timelineTitleActive,
                    current && styles.timelineTitleCurrent,
                  ]}>
                  {status}
                </Text>
                <View
                  style={[
                    styles.stageBadge,
                    completed && styles.stageBadgeCompleted,
                    current && styles.stageBadgeCurrent,
                    pending && styles.stageBadgePending,
                  ]}>
                  <Text
                    style={[
                      styles.stageBadgeText,
                      completed && styles.stageBadgeTextCompleted,
                      current && styles.stageBadgeTextCurrent,
                      pending && styles.stageBadgeTextPending,
                    ]}>
                    {completed ? 'Completed' : current ? 'Current' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.timelineCopy, pending && styles.timelineCopyPending]}>
                {statusDescriptions[status]}
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
    fontWeight: '900',
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
    backgroundColor: BrandColors.deepBlue,
    borderColor: BrandColors.deepBlue,
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
    backgroundColor: BrandColors.deepBlue,
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
    fontWeight: '800',
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
    color: '#7A8798',
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
    fontWeight: '900',
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
