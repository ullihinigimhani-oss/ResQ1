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

import { StatusBanner } from '@/components/common/auth-components';
import {
  AppHeader,
  AppIcon,
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  deleteBasicPhoneResident,
  getBasicPhoneResidents,
  isBasicPhoneResidentApiError,
} from '@/services/basicPhoneResidentService';
import type { BasicPhoneResident } from '@/types/basicPhoneResident';
import { isCommunityMemberRole } from '@/utils/format';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function confirmationMessage(resident: BasicPhoneResident) {
  return `Remove ${resident.fullName} from emergency SMS registration?`;
}

function confirmRemoval(resident: BasicPhoneResident, onConfirm: () => void) {
  const message = confirmationMessage(resident);

  if (Platform.OS === 'web') {
    const webConfirm = (globalThis as typeof globalThis & {
      confirm?: (text: string) => boolean;
    }).confirm;

    if (typeof webConfirm === 'function') {
      if (webConfirm(message)) {
        onConfirm();
      }
      return;
    }
  }

  NativeAlert.alert('Remove Basic Phone Resident', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function BasicPhoneResidentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ notice?: string | string[] }>();
  const { isLoading: authLoading, token, user } = useAuth();
  const [residents, setResidents] = useState<BasicPhoneResident[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(() => {
    const notice = firstParam(params.notice);
    if (notice === 'added') return 'Basic phone resident registered successfully.';
    if (notice === 'updated') return 'Basic phone resident updated successfully.';
    return null;
  });
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadResidents = useCallback(async () => {
    if (!token || !user || !isCommunityMemberRole(user.role)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setResidents(await getBasicPhoneResidents(token));
    } catch (error) {
      setErrorMessage(
        isBasicPhoneResidentApiError(error)
          ? error.message
          : 'Unable to load basic phone residents.',
      );
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useFocusEffect(useCallback(() => {
    void loadResidents();
  }, [loadResidents]));

  if (!authLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!authLoading && user && !isCommunityMemberRole(user.role)) {
    return <Redirect href={'/dashboard' as Href} />;
  }

  if (authLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading basic phone residents..." />
      </ScreenContainer>
    );
  }

  const removeResident = async (resident: BasicPhoneResident) => {
    if (!token || removingId !== null) {
      return;
    }

    setRemovingId(resident.id);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await deleteBasicPhoneResident(token, resident.id);
      setResidents((current) => current.filter((item) => item.id !== resident.id));
      setNoticeMessage(`${resident.fullName} was removed from emergency SMS registration.`);
    } catch (error) {
      setErrorMessage(
        isBasicPhoneResidentApiError(error)
          ? error.message
          : 'Unable to remove this resident. Please try again.',
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Community Member"
        onBack={() => router.replace('/dashboard' as Href)}
        subtitle="Register residents without smartphones for future emergency SMS alerts."
        title="Basic Phone Residents"
      />

      {noticeMessage ? <StatusBanner message={noticeMessage} type="success" /> : null}

      <View style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <Text style={styles.toolbarTitle}>Registered Residents</Text>
          <Text style={styles.toolbarCount}>
            {residents.length} {residents.length === 1 ? 'resident' : 'residents'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/basic-phone-residents/add' as Href)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <Text style={styles.addButtonText}>+ Add Resident</Text>
        </Pressable>
      </View>

      {loading ? <LoadingState message="Loading registered residents..." /> : null}

      {!loading && errorMessage ? (
        <View style={styles.stateCard}>
          <StatusBanner message={errorMessage} type="error" />
          <PrimaryButton onPress={() => void loadResidents()} title="Retry" />
        </View>
      ) : null}

      {!loading && !errorMessage && residents.length === 0 ? (
        <EmptyState
          action={(
            <PrimaryButton
              onPress={() => router.push('/basic-phone-residents/add' as Href)}
              title="Add Resident"
            />
          )}
          body="Add a resident's name, Sri Lankan mobile number, and area for future emergency SMS alerts."
          title="No basic-phone residents have been registered yet."
        />
      ) : null}

      {!loading && !errorMessage && residents.length > 0 ? (
        <View style={styles.list}>
          {residents.map((resident) => (
            <View key={resident.id} style={styles.residentCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.identityRow}>
                  <View style={styles.residentIcon}>
                    <AppIcon fallback="P" name="person.fill" size={18} tintColor={colors.deepBlue} />
                  </View>
                  <View style={styles.identityCopy}>
                    <Text numberOfLines={2} style={styles.residentName}>{resident.fullName}</Text>
                    <Text style={styles.mobileNumber}>{resident.mobileNumber}</Text>
                  </View>
                </View>
                <StatusBadge label="REGISTERED" tone="green" />
              </View>

              <View style={styles.areaRow}>
                <AppIcon fallback="L" name="location.fill" size={15} tintColor={colors.muted} />
                <Text numberOfLines={2} style={styles.areaText}>{resident.area}</Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={removingId !== null}
                  onPress={() => router.push(`/basic-phone-residents/${resident.id}/edit` as Href)}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                  <Text style={styles.editActionText}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={removingId !== null}
                  onPress={() => confirmRemoval(resident, () => void removeResident(resident))}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.removeButton,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.removeActionText}>
                    {removingId === resident.id ? 'Removing...' : 'Remove'}
                  </Text>
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
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  toolbarCopy: {
    flex: 1,
    gap: 2,
  },
  toolbarTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  toolbarCount: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryAction,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  stateCard: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  residentCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  cardTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  identityRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  residentIcon: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  residentName: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  mobileNumber: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  areaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  areaText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  removeButton: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
  },
  editActionText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  removeActionText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
