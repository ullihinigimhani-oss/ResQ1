import { StatusBar } from 'expo-status-bar';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation, PrimaryButton, SecondaryButton } from '@/components/ui/app-components';
import { colors, radius, shadows, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  getCommunityNotifications,
  getManagedCommunityNotifications,
  isCommunityNotificationApiError,
  updateCommunityNotificationStatus,
} from '@/services/communityNotificationService';
import type { CommunityNotification, CommunityNotificationCategory } from '@/types/communityNotification';
import type { PreferredLanguage } from '@/types/auth';
import { formatDateTime, isAuthorityRole, preview } from '@/utils/format';
import {
  communityNotificationUiText,
  preferredLanguageLabels,
  preferredLanguageOrNull,
  preferredLanguages,
  toPreferredLanguage,
  translateCommunityNotificationCategory,
} from '@/utils/language';

type CategoryTone = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

const categoryTones: Record<CommunityNotificationCategory, CategoryTone> = {
  COMMUNITY_EVENT: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    color: colors.success,
  },
  PUBLIC_INFORMATION: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    color: colors.deepBlue,
  },
  ROAD_ACCESS: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amber,
    color: '#7A4B00',
  },
  SAFETY_NOTICE: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    color: colors.red,
  },
  UTILITY_NOTICE: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    color: colors.slate,
  },
};
const LOAD_ERROR = 'LOAD_ERROR';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function notificationDate(value: string) {
  return formatDateTime(value);
}

function statusTone(status: CommunityNotification['status']) {
  if (status === 'ACTIVE') {
    return {
      backgroundColor: colors.successSoft,
      borderColor: colors.success,
      color: colors.success,
    };
  }

  if (status === 'CANCELLED') {
    return {
      backgroundColor: colors.redSoft,
      borderColor: colors.red,
      color: colors.red,
    };
  }

  if (status === 'EXPIRED') {
    return {
      backgroundColor: colors.amberSoft,
      borderColor: colors.amber,
      color: '#7A4B00',
    };
  }

  return {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    color: colors.muted,
  };
}

function CompactBadge({
  backgroundColor,
  borderColor,
  color,
  label,
}: CategoryTone & {
  label: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor, borderColor }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function LoadingCard({ message }: { message: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.red} size="large" />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

function ErrorCard({
  body,
  onRetry,
  retryLabel,
  title,
}: {
  body: string;
  onRetry: () => void;
  retryLabel: string;
  title: string;
}) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      <SecondaryButton title={retryLabel} onPress={onRetry} />
    </View>
  );
}

function LanguageSelector({
  onChange,
  selectedLanguage,
}: {
  onChange: (language: PreferredLanguage) => void;
  selectedLanguage: PreferredLanguage;
}) {
  return (
    <View style={styles.languageSelector}>
      {preferredLanguages.map((language) => {
        const selected = selectedLanguage === language;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={language}
            onPress={() => onChange(language)}
            style={({ pressed }) => [
              styles.languageOption,
              selected && styles.languageOptionSelected,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.languageOptionText, selected && styles.languageOptionTextSelected]}>
              {preferredLanguageLabels[language]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ResidentNotificationCard({
  language,
  notification,
  onPress,
}: {
  language: PreferredLanguage;
  notification: CommunityNotification;
  onPress: (notification: CommunityNotification) => void;
}) {
  const copy = communityNotificationUiText[language];
  const categoryTone = categoryTones[notification.category];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        styles.residentCard,
        !notification.isRead && styles.unreadResidentCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.notificationTopRow}>
        <View style={styles.titleRow}>
          {!notification.isRead ? <View style={styles.unreadDot} /> : null}
          <Text numberOfLines={1} style={[styles.cardTitle, !notification.isRead && styles.unreadTitle]}>
            {notification.title}
          </Text>
        </View>
        {!notification.isRead ? (
          <CompactBadge
            backgroundColor={colors.redSoft}
            borderColor={colors.red}
            color={colors.red}
            label={copy.new}
          />
        ) : null}
      </View>

      <View style={styles.badgeRow}>
        <CompactBadge
          backgroundColor={categoryTone.backgroundColor}
          borderColor={categoryTone.borderColor}
          color={categoryTone.color}
          label={translateCommunityNotificationCategory(notification.category, language)}
        />
        <Text numberOfLines={1} style={styles.areaText}>
          {'\u{1F4CD}'} {notification.targetArea}
        </Text>
      </View>

      <Text numberOfLines={2} style={styles.previewText}>{preview(notification.message, 112)}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.publishedText}>{notificationDate(notification.createdAt)}</Text>
        <Text style={styles.viewActionText}>{copy.viewDetails} -&gt;</Text>
      </View>
    </Pressable>
  );
}

function AuthorityNotificationCard({
  cancelling,
  notification,
  onCancel,
  onView,
}: {
  cancelling: boolean;
  notification: CommunityNotification;
  onCancel: (notification: CommunityNotification) => void;
  onView: (notification: CommunityNotification) => void;
}) {
  const categoryTone = categoryTones[notification.category];
  const tone = statusTone(notification.status);

  return (
    <View style={styles.authorityCard}>
      <View style={styles.notificationTopRow}>
        <View style={styles.authorityTitleBlock}>
          <Text numberOfLines={1} style={styles.cardTitle}>{notification.title}</Text>
          <Text style={styles.areaText}>{notification.targetArea}</Text>
        </View>
        <CompactBadge
          backgroundColor={tone.backgroundColor}
          borderColor={tone.borderColor}
          color={tone.color}
          label={notification.status}
        />
      </View>

      <View style={styles.badgeRow}>
        <CompactBadge
          backgroundColor={categoryTone.backgroundColor}
          borderColor={categoryTone.borderColor}
          color={categoryTone.color}
          label={translateCommunityNotificationCategory(notification.category, 'English')}
        />
        <Text style={styles.publishedText}>Published: {notificationDate(notification.createdAt)}</Text>
      </View>

      <Text numberOfLines={2} style={styles.previewText}>{preview(notification.message, 128)}</Text>

      <View style={styles.authorityActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onView(notification)}
          style={({ pressed }) => [styles.authorityViewButton, pressed && styles.pressed]}>
          <Text style={styles.authorityViewButtonText}>View</Text>
        </Pressable>
        {notification.status === 'ACTIVE' ? (
          <Pressable
            accessibilityRole="button"
            disabled={cancelling}
            onPress={() => onCancel(notification)}
            style={({ pressed }) => [
              styles.authorityCancelButton,
              cancelling && styles.disabled,
              pressed && !cancelling && styles.pressed,
            ]}>
            <Text style={styles.authorityCancelButtonText}>{cancelling ? 'Cancelling...' : 'Cancel'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function CommunityNotificationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const routeLanguage = preferredLanguageOrNull(firstParam(params.language));
  const { isLoading, token, user } = useAuth();
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<PreferredLanguage>(
    routeLanguage ?? toPreferredLanguage(user?.preferredLanguage),
  );
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const authority = isAuthorityRole(user?.role);
  const activeLanguage = authority ? 'English' : selectedLanguage;
  const copy = communityNotificationUiText[activeLanguage];
  const unreadCount = authority ? 0 : notifications.filter((notification) => !notification.isRead).length;
  const displayedErrorTitle = errorMessage === LOAD_ERROR ? copy.errorTitle : errorMessage;

  const loadNotifications = useCallback(async (refresh = false) => {
    if (!token || !user) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage(null);

    try {
      setNotifications(
        authority
          ? await getManagedCommunityNotifications(token)
          : await getCommunityNotifications(token),
      );
    } catch (error) {
      if (__DEV__ && !isCommunityNotificationApiError(error)) {
        console.warn('Unexpected community notification list error:', error);
      }

      setErrorMessage(LOAD_ERROR);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authority, token, user]);

  useFocusEffect(useCallback(() => {
    if (token && user) {
      setSelectedLanguage(routeLanguage ?? toPreferredLanguage(user.preferredLanguage));
      void loadNotifications();
    }
  }, [loadNotifications, routeLanguage, token, user]));

  const handleViewNotification = (notification: CommunityNotification) => {
    router.push({
      pathname: '/community-notifications/[id]',
      params: {
        id: String(notification.id),
        language: activeLanguage,
      },
    } as unknown as Href);
  };

  const confirmCancel = (notification: CommunityNotification, onConfirm: () => void) => {
    const message = `${notification.title}\n\nThis notification will no longer appear in resident active feeds.`;

    if (Platform.OS === 'web') {
      const webConfirm = (globalThis as typeof globalThis & { confirm?: (message: string) => boolean }).confirm;

      if (typeof webConfirm === 'function') {
        if (webConfirm(`Cancel this community notification?\n\n${message}`)) {
          onConfirm();
        }

        return;
      }
    }

    NativeAlert.alert('Cancel Community Notification', message, [
      { text: 'Keep Notification', style: 'cancel' },
      { text: 'Cancel Notification', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const handleCancelNotification = (notification: CommunityNotification) => {
    if (!token || cancellingId !== null) {
      return;
    }

    confirmCancel(notification, () => {
      setCancellingId(notification.id);
      updateCommunityNotificationStatus(String(notification.id), { status: 'CANCELLED' }, token)
        .then((updatedNotification) => {
          setNotifications((current) => current.map((item) => (
            item.id === updatedNotification.id ? updatedNotification : item
          )));
        })
        .catch((error) => {
          if (__DEV__ && !isCommunityNotificationApiError(error)) {
            console.warn('Unexpected community notification cancellation error:', error);
          }

          setErrorMessage('Unable to cancel the community notification. Please try again.');
        })
        .finally(() => {
          setCancellingId(null);
        });
    });
  };

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingCard message={copy.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.red}
            onRefresh={() => void loadNotifications(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>
                {authority ? copy.manageCommunityNotifications : copy.communityNotifications}
              </Text>
              <Text style={styles.subtitle}>
                {authority ? copy.shareLocalInformation : copy.subtitle}
              </Text>
            </View>
            {!authority && unreadCount > 0 ? (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>
          {authority ? (
            <PrimaryButton
              title={copy.createCommunityNotification}
              onPress={() => router.push('/community-notifications/create' as Href)}
            />
          ) : (
            <LanguageSelector selectedLanguage={selectedLanguage} onChange={setSelectedLanguage} />
          )}
        </View>

        {errorMessage && !loading ? (
          <ErrorCard
            body={copy.errorBody}
            retryLabel={copy.retry}
            title={displayedErrorTitle ?? copy.errorTitle}
            onRetry={() => void loadNotifications()}
          />
        ) : null}

        {loading ? <LoadingCard message={copy.loading} /> : null}

        {!loading && !errorMessage && notifications.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>{copy.noCommunityNotifications}</Text>
            <Text style={styles.stateText}>{copy.emptyBody}</Text>
          </View>
        ) : null}

        {!loading && !errorMessage && notifications.length > 0 ? (
          <View style={styles.notificationList}>
            {notifications.map((notification) => (
              authority ? (
                <AuthorityNotificationCard
                  cancelling={cancellingId === notification.id}
                  key={notification.id}
                  notification={notification}
                  onCancel={handleCancelNotification}
                  onView={handleViewNotification}
                />
              ) : (
                <ResidentNotificationCard
                  key={notification.id}
                  language={activeLanguage}
                  notification={notification}
                  onPress={handleViewNotification}
                />
              )
            ))}
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: 96,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    gap: spacing.md,
  },
  headerTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerTextBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    ...typography.title,
  },
  subtitle: {
    color: colors.muted,
    ...typography.body,
  },
  unreadCountBadge: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 42,
    paddingHorizontal: spacing.sm,
  },
  unreadCountText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  languageSelector: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  languageOption: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  languageOptionSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  languageOptionText: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  languageOptionTextSelected: {
    color: colors.white,
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 190,
    padding: spacing.xl,
    ...shadows.card,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  stateText: {
    color: colors.muted,
    ...typography.body,
    textAlign: 'center',
  },
  notificationList: {
    gap: spacing.sm,
  },
  residentCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderLeftColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  unreadResidentCard: {
    borderLeftColor: colors.deepBlue,
  },
  authorityCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderLeftColor: colors.deepBlue,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  notificationTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  authorityTitleBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  unreadDot: {
    backgroundColor: colors.red,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  cardTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  unreadTitle: {
    color: colors.deepBlue,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  areaText: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  previewText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  publishedText: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  viewActionText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  authorityActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  authorityViewButton: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: '46%',
    paddingHorizontal: spacing.md,
  },
  authorityViewButtonText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  authorityCancelButton: {
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: '46%',
    paddingHorizontal: spacing.md,
  },
  authorityCancelButtonText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.58,
  },
  pressed: {
    opacity: 0.72,
  },
});
