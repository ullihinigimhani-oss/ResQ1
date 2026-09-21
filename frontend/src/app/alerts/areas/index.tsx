import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert as NativeAlert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  getAlertAreaSubscriptions,
  removeAlertAreaSubscription,
} from '@/services/alertService';
import type { AlertAreaSubscription } from '@/types/alertAreaSubscription';
import { formatDateTime, isAuthorityRole } from '@/utils/format';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function confirmRemoval(subscription: AlertAreaSubscription, onConfirm: () => void) {
  const message = `Remove ${subscription.areaName} from your alert areas?\n\nYou will stop receiving alerts because of this subscription.`;

  if (Platform.OS === 'web') {
    const webConfirm = (globalThis as typeof globalThis & { confirm?: (text: string) => boolean }).confirm;

    if (typeof webConfirm === 'function') {
      if (webConfirm(message)) {
        onConfirm();
      }

      return;
    }
  }

  NativeAlert.alert('Remove Alert Area', message, [
    { text: 'Keep Area', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function AlertAreasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ added?: string | string[] }>();
  const { isLoading: authLoading, token, user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<AlertAreaSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(() => {
    const addedArea = firstParam(params.added);
    return addedArea ? `${addedArea} added to your alert areas.` : null;
  });
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadSubscriptions = useCallback(async () => {
    if (!token || !user || isAuthorityRole(user.role)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setSubscriptions(await getAlertAreaSubscriptions(token));
    } catch {
      setErrorMessage('Unable to load your alert areas.');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useFocusEffect(useCallback(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]));

  if (!authLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!authLoading && user && isAuthorityRole(user.role)) {
    return <Redirect href={'/alerts' as Href} />;
  }

  if (authLoading || !user) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading alert areas..." />
      </ScreenContainer>
    );
  }

  const removeSubscription = (subscription: AlertAreaSubscription) => {
    if (!token || removingId !== null) {
      return;
    }

    confirmRemoval(subscription, () => {
      setRemovingId(subscription.id);
      setErrorMessage(null);
      setNoticeMessage(null);

      void removeAlertAreaSubscription(subscription.id, token)
        .then(() => {
          setSubscriptions((current) => current.filter((item) => item.id !== subscription.id));
          setNoticeMessage(`${subscription.areaName} was removed from your alert areas.`);
        })
        .catch(() => {
          setErrorMessage('Unable to remove this alert area. Please try again.');
        })
        .finally(() => setRemovingId(null));
    });
  };

  return (
    <ScreenContainer>
      <AppHeader
        onBack={() => router.replace('/alerts/preferences' as Href)}
        subtitle="Receive emergency alerts for locations important to you."
        title="Alert Areas"
      />

      <PrimaryButton
        onPress={() => router.push('/alerts/areas/add' as Href)}
        title="+ Add Alert Area"
      />

      {noticeMessage ? (
        <View style={styles.successMessage}>
          <Text style={styles.successMessageText}>{noticeMessage}</Text>
        </View>
      ) : null}

      {errorMessage && subscriptions.length > 0 ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      ) : null}

      {loading ? <LoadingState message="Loading alert areas..." /> : null}

      {!loading && errorMessage && subscriptions.length === 0 ? (
        <EmptyState
          action={<PrimaryButton title="Retry" onPress={() => void loadSubscriptions()} />}
          body="Check your connection and try again."
          title="Unable to load alert areas"
        />
      ) : null}

      {!loading && !errorMessage && subscriptions.length === 0 ? (
        <EmptyState
          action={(
            <PrimaryButton
              title="Add Alert Area"
              onPress={() => router.push('/alerts/areas/add' as Href)}
            />
          )}
          body="Add important locations such as your home, school, or family area to receive relevant emergency alerts."
          title="No alert areas added yet."
        />
      ) : null}

      {!loading && subscriptions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Subscribed Areas</Text>
          <View style={styles.list}>
            {subscriptions.map((subscription) => (
              <View key={subscription.id} style={styles.card}>
                <View style={styles.iconBox}>
                  <AppIcon fallback="A" name="location.fill" size={22} tintColor={colors.deepBlue} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.titleBlock}>
                      <Text style={styles.label}>{subscription.label}</Text>
                      <Text style={styles.areaName}>{subscription.areaName}</Text>
                    </View>
                    <View style={styles.subscribedBadge}>
                      <Text style={styles.subscribedBadgeText}>SUBSCRIBED</Text>
                    </View>
                  </View>
                  <Text style={styles.savedDate}>Added {formatDateTime(subscription.createdAt)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={removingId !== null}
                    onPress={() => removeSubscription(subscription)}
                    style={({ pressed }) => [
                      styles.removeButton,
                      pressed && removingId === null && styles.pressed,
                    ]}>
                    <AppIcon fallback="X" name="trash.fill" size={16} tintColor={colors.red} />
                    <Text style={styles.removeButtonText}>
                      {removingId === subscription.id ? 'Removing...' : 'Remove'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardContent: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  cardTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 120,
  },
  label: {
    color: colors.deepBlue,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  areaName: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  subscribedBadge: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  subscribedBadgeText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 12,
  },
  savedDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  removeButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.redBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  removeButtonText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  successMessage: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  successMessageText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  errorMessage: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorMessageText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
