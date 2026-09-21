import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert as NativeAlert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RiskBadge } from '@/components/alerts/alert-badges';
import {
  AppHeader,
  AppIcon,
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  getOfflineSafetyInstructions,
  removeOfflineSafetyInstruction,
} from '@/services/offlineSafetyService';
import type { OfflineSafetyInstruction } from '@/types/offline-safety';
import { formatDateTime, isAuthorityRole, preview } from '@/utils/format';

function confirmRemoval(instruction: OfflineSafetyInstruction, onConfirm: () => void) {
  const message = `${instruction.title}\n\nThis saved guidance will be removed from offline storage.`;

  if (Platform.OS === 'web') {
    const webConfirm = (globalThis as typeof globalThis & { confirm?: (text: string) => boolean }).confirm;

    if (typeof webConfirm === 'function') {
      if (webConfirm(`Remove saved instructions?\n\n${message}`)) {
        onConfirm();
      }

      return;
    }
  }

  NativeAlert.alert('Remove Saved Instructions', message, [
    { text: 'Keep Instructions', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function SavedSafetyInstructionsScreen() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useAuth();
  const [instructions, setInstructions] = useState<OfflineSafetyInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [removingAlertId, setRemovingAlertId] = useState<number | null>(null);

  const loadInstructions = useCallback(async () => {
    if (!user || isAuthorityRole(user.role)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);

    try {
      setInstructions(await getOfflineSafetyInstructions(user.id));
    } catch (error) {
      if (__DEV__) {
        console.warn('Unable to load offline safety instructions:', error);
      }

      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void loadInstructions();
  }, [loadInstructions]));

  if (!authLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!authLoading && user && isAuthorityRole(user.role)) {
    return <Redirect href={'/alerts' as Href} />;
  }

  if (authLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading saved safety instructions..." />
      </ScreenContainer>
    );
  }

  const handleRemove = (instruction: OfflineSafetyInstruction) => {
    if (removingAlertId !== null) {
      return;
    }

    confirmRemoval(instruction, () => {
      setRemovingAlertId(instruction.alertId);
      void removeOfflineSafetyInstruction(user.id, instruction.alertId)
        .then(() => {
          setInstructions((current) => current.filter((item) => item.alertId !== instruction.alertId));
        })
        .catch((error) => {
          if (__DEV__) {
            console.warn('Unable to remove offline safety instructions:', error);
          }

          setLoadError(true);
        })
        .finally(() => {
          setRemovingAlertId(null);
        });
    });
  };

  return (
    <ScreenContainer>
      <AppHeader
        onBack={() => router.back()}
        subtitle="Emergency guidance available without internet access."
        title="Saved Safety Instructions"
      />

      {loading ? <LoadingState message="Loading saved safety instructions..." /> : null}

      {!loading && loadError ? (
        <EmptyState
          action={<PrimaryButton title="Try Again" onPress={() => void loadInstructions()} />}
          body="Offline storage could not be read on this device."
          title="Unable to load saved instructions"
        />
      ) : null}

      {!loading && !loadError && instructions.length === 0 ? (
        <EmptyState
          action={(
            <PrimaryButton
              title="View Emergency Alerts"
              onPress={() => router.push('/alerts' as Href)}
            />
          )}
          body="Open an emergency alert and save its safety instructions for offline access."
          title="No offline instructions saved yet."
        />
      ) : null}

      {!loading && !loadError && instructions.length > 0 ? (
        <View style={styles.list}>
          {instructions.map((instruction) => (
            <View key={instruction.alertId} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleBlock}>
                  <Text style={styles.disasterType}>{instruction.disasterType}</Text>
                  <Text style={styles.title}>{instruction.title}</Text>
                </View>
                <RiskBadge riskLevel={instruction.riskLevel} />
              </View>

              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <AppIcon fallback="A" name="house.fill" size={16} tintColor={colors.muted} />
                  <Text style={styles.metaText}>{instruction.affectedArea}</Text>
                </View>
                <View style={styles.metaRow}>
                  <AppIcon fallback="S" name="clock.fill" size={16} tintColor={colors.muted} />
                  <Text style={styles.metaText}>Saved {formatDateTime(instruction.savedAt)}</Text>
                </View>
              </View>

              <Text numberOfLines={3} style={styles.preview}>
                {preview(instruction.safetyInstructions.join(' '), 180)}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({
                    pathname: '/offline-safety/[alertId]',
                    params: { alertId: String(instruction.alertId) },
                  } as unknown as Href)}
                  style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}>
                  <Text style={styles.viewButtonText}>View Instructions</Text>
                  <Text style={styles.viewArrow}>-&gt;</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove saved instructions for ${instruction.title}`}
                  accessibilityRole="button"
                  disabled={removingAlertId !== null}
                  hitSlop={8}
                  onPress={() => handleRemove(instruction)}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed && removingAlertId === null && styles.pressed,
                  ]}>
                  <AppIcon fallback="X" name="trash.fill" size={19} tintColor={colors.red} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 180,
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
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  metaBlock: {
    gap: spacing.sm,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  preview: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  actions: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  viewButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  viewButtonText: {
    color: colors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  viewArrow: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: {
    opacity: 0.72,
  },
});
