import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RiskBadge } from '@/components/alerts/alert-badges';
import {
  AppHeader,
  AppIcon,
  EmptyState,
  InfoRow,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getOfflineSafetyInstruction } from '@/services/offlineSafetyService';
import type { OfflineSafetyInstruction } from '@/types/offline-safety';
import { formatDateTime, isAuthorityRole } from '@/utils/format';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function OfflineSafetyInstructionDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alertId = Number(firstParam(params.alertId));
  const { isLoading: authLoading, user } = useAuth();
  const [instruction, setInstruction] = useState<OfflineSafetyInstruction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadInstruction = useCallback(async () => {
    if (!user || isAuthorityRole(user.role) || !Number.isInteger(alertId) || alertId <= 0) {
      setLoading(false);
      setInstruction(null);
      return;
    }

    setLoading(true);
    setLoadError(false);

    try {
      setInstruction(await getOfflineSafetyInstruction(user.id, alertId));
    } catch (error) {
      if (__DEV__) {
        console.warn('Unable to load the offline safety instruction:', error);
      }

      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [alertId, user]);

  useFocusEffect(useCallback(() => {
    void loadInstruction();
  }, [loadInstruction]));

  if (!authLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!authLoading && user && isAuthorityRole(user.role)) {
    return <Redirect href={'/alerts' as Href} />;
  }

  if (authLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Opening offline safety instructions..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer bottomNav={false}>
      <AppHeader
        onBack={() => router.back()}
        subtitle="This guidance is stored on this device and is available without internet access."
        title="Safety Instructions"
      />

      {loading ? <LoadingState message="Opening offline safety instructions..." /> : null}

      {!loading && loadError ? (
        <EmptyState
          action={<PrimaryButton title="Try Again" onPress={() => void loadInstruction()} />}
          body="Offline storage could not be read on this device."
          title="Unable to open saved instructions"
        />
      ) : null}

      {!loading && !loadError && !instruction ? (
        <EmptyState
          action={(
            <PrimaryButton
              title="Back to Saved Instructions"
              onPress={() => router.replace('/offline-safety' as Href)}
            />
          )}
          body="This item may have been removed from offline storage."
          title="Saved instructions not found"
        />
      ) : null}

      {!loading && !loadError && instruction ? (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIcon}>
                <AppIcon fallback="!" name="cross.case.fill" size={25} tintColor={colors.onPrimary} />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.disasterType}>{instruction.disasterType}</Text>
                <Text style={styles.title}>{instruction.title}</Text>
              </View>
              <RiskBadge riskLevel={instruction.riskLevel} />
            </View>
            <View style={styles.offlineBadge}>
              <AppIcon fallback="D" name="arrow.down.circle.fill" size={16} tintColor={colors.success} />
              <Text style={styles.offlineBadgeText}>AVAILABLE OFFLINE</Text>
            </View>
          </View>

          <SectionCard title="Saved Alert Information">
            <InfoRow label="Location" value={instruction.affectedArea} />
            <InfoRow label="Severity" value={instruction.riskLevel.toUpperCase()} />
            <InfoRow label="Saved" value={formatDateTime(instruction.savedAt)} />
          </SectionCard>

          <SectionCard
            subtitle="Follow official emergency guidance and move to safety when instructed."
            title="Complete Safety Instructions">
            <View style={styles.instructionList}>
              {instruction.safetyInstructions.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.instructionRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.instructionText}>{item}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.deepBlue,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 150,
  },
  disasterType: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  offlineBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  offlineBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  instructionList: {
    gap: spacing.md,
  },
  instructionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  bullet: {
    backgroundColor: colors.deepBlue,
    borderRadius: 4,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  instructionText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
});
