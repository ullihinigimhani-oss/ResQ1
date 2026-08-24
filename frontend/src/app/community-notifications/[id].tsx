import { StatusBar } from 'expo-status-bar';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, StatusBanner } from '@/components/common/auth-components';
import { AppIcon } from '@/components/ui/app-components';
import { BrandColors } from '@/constants/brand';
import { colors, radius, shadows, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  getCommunityNotificationById,
  isCommunityNotificationApiError,
  markCommunityNotificationRead,
} from '@/services/communityNotificationService';
import type { CommunityNotification } from '@/types/communityNotification';
import { formatDateTime, isAuthorityRole } from '@/utils/format';
import {
  communityNotificationUiText,
  preferredLanguageLabels,
  preferredLanguageOrNull,
  toPreferredLanguage,
  translateCommunityNotificationCategory,
  translateCommunityNotificationStatus,
} from '@/utils/language';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function DetailBackButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <Text style={styles.backButtonText}>{label}</Text>
    </Pressable>
  );
}

function DetailRow({
  children,
  fallback,
  label,
  name,
  value,
}: {
  children?: ReactNode;
  fallback: string;
  label: string;
  name: string;
  value?: string | null;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <AppIcon fallback={fallback} name={name} size={22} tintColor={BrandColors.navy} />
      </View>
      <View style={styles.detailTextBlock}>
        <Text style={styles.detailLabel}>{label}</Text>
        {value ? <Text style={styles.detailValue}>{value}</Text> : children}
      </View>
    </View>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

export default function CommunityNotificationDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const notificationId = firstParam(params.id);
  const published = firstParam(params.published) === '1';
  const routeLanguage = preferredLanguageOrNull(firstParam(params.language));
  const { isLoading, token, user } = useAuth();
  const [notification, setNotification] = useState<CommunityNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readError, setReadError] = useState(false);

  const authority = isAuthorityRole(user?.role);
  const selectedLanguage = routeLanguage ?? toPreferredLanguage(user?.preferredLanguage);
  const displayLanguage = authority ? 'English' : selectedLanguage;
  const copy = communityNotificationUiText[displayLanguage];

  const loadNotification = useCallback(async (refresh = false) => {
    if (!token || !notificationId) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage(null);
    setReadError(false);

    try {
      const loadedNotification = await getCommunityNotificationById(notificationId, token);
      setNotification(loadedNotification);

      if (!authority && !loadedNotification.isRead) {
        try {
          setNotification(await markCommunityNotificationRead(notificationId, token));
        } catch (readMarkError) {
          if (__DEV__ && !isCommunityNotificationApiError(readMarkError)) {
            console.warn('Unexpected community notification read error:', readMarkError);
          }

          setReadError(true);
        }
      }
    } catch (error) {
      if (__DEV__ && !isCommunityNotificationApiError(error)) {
        console.warn('Unexpected community notification detail error:', error);
      }

      setErrorMessage(copy.errorTitle);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authority, copy.errorTitle, notificationId, token]);

  useFocusEffect(useCallback(() => {
    if (token && notificationId) {
      void loadNotification();
    } else if (!notificationId) {
      setLoading(false);
      setErrorMessage(copy.errorTitle);
    }
  }, [copy.errorTitle, loadNotification, notificationId, token]));

  const handleBack = () => {
    if (authority) {
      router.replace('/community-notifications' as Href);
      return;
    }

    router.replace({
      pathname: '/community-notifications',
      params: { language: selectedLanguage },
    } as unknown as Href);
  };

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={BrandColors.red} size="large" />
          <Text style={styles.stateText}>{copy.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showInitialLoading = loading && !notification;
  const showError = Boolean(errorMessage) && !notification && !showInitialLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadNotification(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <DetailBackButton label={copy.back} onPress={handleBack} />
          <Text style={styles.topBarTitle}>{copy.notificationDetails}</Text>
        </View>

        {!authority ? (
          <View style={styles.languageContext}>
            <Text style={styles.languageContextLabel}>{copy.language}</Text>
            <Text style={styles.languageContextValue}>{preferredLanguageLabels[displayLanguage]}</Text>
          </View>
        ) : null}

        {published ? <StatusBanner message={copy.publishSuccess} type="success" /> : null}
        {readError ? <StatusBanner message={copy.readStatusError} type="error" /> : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateText}>{copy.loading}</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>{copy.errorTitle}</Text>
            <Text style={styles.stateText}>{copy.errorBody}</Text>
            <AuthButton
              style={styles.retryButton}
              title={copy.retry}
              variant="secondary"
              onPress={() => void loadNotification()}
            />
          </View>
        ) : null}

        {notification ? (
          <View style={styles.detailCard}>
            <View style={styles.detailHero}>
              <View style={styles.heroTitleRow}>
                <View style={styles.heroIcon}>
                  <AppIcon fallback="N" name="bell.fill" size={28} tintColor={BrandColors.deepBlue} />
                </View>
                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroTitle}>{notification.title}</Text>
                  <Text style={styles.heroSubtitle}>
                    {translateCommunityNotificationCategory(notification.category, displayLanguage)}
                  </Text>
                </View>
                <StatusPill label={translateCommunityNotificationStatus(notification.status, displayLanguage)} />
              </View>
            </View>

            <View style={styles.detailList}>
              <DetailRow
                fallback="C"
                label={copy.category}
                name="slider.horizontal.3"
                value={translateCommunityNotificationCategory(notification.category, displayLanguage)}
              />
              <DetailRow fallback="A" label={copy.area} name="house.fill" value={notification.targetArea} />
              <DetailRow
                fallback="P"
                label={copy.published}
                name="clock.fill"
                value={formatDateTime(notification.createdAt)}
              />
              {notification.expiresAt ? (
                <DetailRow
                  fallback="V"
                  label={copy.validUntil}
                  name="clock.fill"
                  value={formatDateTime(notification.expiresAt)}
                />
              ) : null}
              <DetailRow fallback="S" label={copy.status} name="bell.fill">
                <StatusPill label={translateCommunityNotificationStatus(notification.status, displayLanguage)} />
              </DetailRow>
              <DetailRow fallback="M" label={copy.message} name="slider.horizontal.3">
                <Text style={styles.messageText}>{notification.message}</Text>
              </DetailRow>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  topBarTitle: {
    color: BrandColors.navy,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },
  backButtonText: {
    color: BrandColors.navy,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  languageContext: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  languageContextLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  languageContextValue: {
    color: BrandColors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 220,
    padding: spacing.xl,
    ...shadows.card,
  },
  emptyTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  stateText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xs,
    width: '100%',
  },
  detailCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
  },
  detailHero: {
    backgroundColor: colors.lightBlue,
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    padding: spacing.lg,
  },
  heroTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  heroTextBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  heroTitle: {
    color: BrandColors.navy,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  heroSubtitle: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPillText: {
    color: BrandColors.success,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  detailList: {
    paddingHorizontal: spacing.lg,
  },
  detailRow: {
    alignItems: 'flex-start',
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  detailIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    width: 28,
  },
  detailTextBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  detailLabel: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  detailValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  messageText: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.72,
  },
});
