import { Redirect, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  DemoNotice,
  InfoRow,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { formatRole, initials } from '@/utils/format';

function ActionRow({
  label,
  onPress,
  status,
}: {
  label: string;
  onPress: () => void;
  status?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
      <Text style={styles.actionLabel}>{label}</Text>
      {status ? <StatusBadge label={status} tone="amber" /> : <Text style={styles.actionArrow}>{'>'}</Text>}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoading, signOut, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading your resident profile..." />
      </ScreenContainer>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/welcome' as Href);
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Resident Account"
        title="My Profile"
        subtitle="Your real Sprint 1 account details and future resident profile tools."
      />

      <View style={styles.identityPanel}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
        </View>
        <View style={styles.identityBlock}>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.identityBadges}>
            <StatusBadge label={`Resident ID ${user.id}`} tone="blue" />
            <StatusBadge label={formatRole(user.role)} tone="green" />
          </View>
        </View>
      </View>

      <SectionCard title="Personal Details">
        <InfoRow label="Full Name" value={user.fullName} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Preferred Language" value={user.preferredLanguage} />
        <InfoRow label="Role" value={formatRole(user.role)} />
      </SectionCard>

      <SectionCard title="Location">
        <InfoRow label="Registered Area" value={user.location || 'Not set'} />
      </SectionCard>

      <SectionCard title="Account">
        <ActionRow label="Edit Profile" onPress={() => router.push('/profile/edit' as Href)} />
        <ActionRow
          label="Change Password"
          status="Future"
          onPress={() => router.push('/profile/change-password' as Href)}
        />
        <ActionRow
          label="Household Information"
          status="Demo"
          onPress={() => router.push('/household' as Href)}
        />
        <ActionRow label="Settings" onPress={() => router.push('/settings' as Href)} />
      </SectionCard>

      <PrimaryButton title="Sign Out" tone="red" onPress={handleSignOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  identityPanel: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: colors.deepBlue,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  identityBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },
  email: {
    color: colors.sky,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  identityBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: spacing.md,
  },
  actionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  actionArrow: {
    color: colors.deepBlue,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.72,
  },
});
