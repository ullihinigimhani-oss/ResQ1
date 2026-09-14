import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';

type BadgeTone = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

const neutralTone: BadgeTone = {
  backgroundColor: BrandColors.lightBlue,
  borderColor: BrandColors.border,
  color: BrandColors.text,
};

const shelterStatusTones: Record<string, BadgeTone> = {
  open: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
    color: BrandColors.success,
  },
  limited: {
    backgroundColor: BrandColors.warningSoft,
    borderColor: '#D69E2E',
    color: '#7A4B00',
  },
  full: {
    backgroundColor: '#EEF2F7',
    borderColor: BrandColors.muted,
    color: BrandColors.navy,
  },
  closed: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
    color: BrandColors.red,
  },
};

const roadStatusTones: Record<string, BadgeTone> = {
  safe: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
    color: BrandColors.success,
  },
  caution: {
    backgroundColor: BrandColors.warningSoft,
    borderColor: '#D69E2E',
    color: '#7A4B00',
  },
  blocked: {
    backgroundColor: BrandColors.red,
    borderColor: BrandColors.red,
    color: BrandColors.white,
  },
};

function normalizedStatus(value: string) {
  return value.trim().toLowerCase();
}

function toneForStatus(value: string, tones: Record<string, BadgeTone>) {
  return tones[normalizedStatus(value)] ?? neutralTone;
}

export function ShelterStatusBadge({ status }: { status: string }) {
  const tone = toneForStatus(status, shelterStatusTones);

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

export function RoadStatusBadge({ status }: { status: string }) {
  const tone = toneForStatus(status, roadStatusTones);

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

export function CapacityIndicator({
  availableSpaces,
  capacity,
  currentOccupancy,
}: {
  availableSpaces: number | null;
  capacity: number | null;
  currentOccupancy: number | null;
}) {
  if (capacity === null || currentOccupancy === null || capacity <= 0) {
    return (
      <View style={styles.capacityShell}>
        <Text style={styles.capacityUnavailable}>Capacity information unavailable</Text>
      </View>
    );
  }

  const occupiedPercentage = Math.min(Math.max(currentOccupancy / capacity, 0), 1);
  const available = availableSpaces ?? Math.max(capacity - currentOccupancy, 0);

  return (
    <View style={styles.capacityShell}>
      <View style={styles.capacityHeader}>
        <Text style={styles.capacityTitle}>{available} of {capacity} spaces available</Text>
        <Text style={styles.capacityMeta}>{currentOccupancy} / {capacity} occupied</Text>
      </View>
      <View
        accessibilityLabel={`${currentOccupancy} of ${capacity} spaces occupied`}
        accessibilityRole="progressbar"
        style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${occupiedPercentage * 100}%` }]} />
      </View>
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
  capacityShell: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  capacityHeader: {
    gap: 3,
  },
  capacityTitle: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  capacityMeta: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  capacityUnavailable: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  progressTrack: {
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: BrandColors.deepBlue,
    borderRadius: 8,
    height: '100%',
  },
});
