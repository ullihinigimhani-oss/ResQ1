import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import {
  incidentStatusWorkflow,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/types/incident';

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
  const currentIndex = incidentStatusWorkflow.indexOf(currentStatus);

  return (
    <View style={styles.timeline}>
      {incidentStatusWorkflow.map((status, index) => {
        const reached = index <= currentIndex;
        const current = index === currentIndex;

        return (
          <View key={status} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={[styles.timelineDot, reached && styles.timelineDotActive, current && styles.timelineDotCurrent]} />
              {index < incidentStatusWorkflow.length - 1 ? (
                <View style={[styles.timelineLine, index < currentIndex && styles.timelineLineActive]} />
              ) : null}
            </View>
            <View style={styles.timelineTextBlock}>
              <Text style={[styles.timelineTitle, reached && styles.timelineTitleActive]}>{status}</Text>
              <Text style={styles.timelineCopy}>
                {current ? 'Current status' : reached ? 'Completed stage' : 'Next stage'}
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
    minHeight: 58,
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
    height: 16,
    width: 16,
  },
  timelineDotActive: {
    backgroundColor: BrandColors.deepBlue,
    borderColor: BrandColors.deepBlue,
  },
  timelineDotCurrent: {
    backgroundColor: BrandColors.red,
    borderColor: BrandColors.red,
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
    paddingBottom: 18,
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
  timelineCopy: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
  },
});
