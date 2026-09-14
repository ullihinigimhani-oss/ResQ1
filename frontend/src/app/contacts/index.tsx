import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBanner } from '@/components/common/auth-components';
import {
  AppHeader,
  DemoNotice,
  LoadingState,
  ScreenContainer,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { emergencyContactGroups } from '@/services/futureServices';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading emergency contacts..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Emergency Contacts"
        title="Emergency Contacts"
        subtitle="Configuration-safe contact directory for residents."
        onBack={() => router.replace('/dashboard' as Href)}
      />

      <DemoNotice text="Official numbers are not present in project data. Entries are clearly marked as demo/configuration placeholders." />
      {message ? <StatusBanner message={message} type="error" /> : null}

      {emergencyContactGroups.map((group) => (
        <SectionCard key={group.title} title={group.title}>
          <View style={styles.contactList}>
            {group.contacts.map((contact) => (
              <View key={contact.label} style={styles.contactRow}>
                <View style={styles.contactTextBlock}>
                  <Text style={styles.contactLabel}>{contact.label}</Text>
                  <Text style={styles.contactValue}>{contact.value}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setMessage(`${contact.label} phone number is not configured in project data.`)}
                    style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                    <Text style={styles.actionText}>Call</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setMessage(`${contact.label} details are pending official configuration.`)}
                    style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                    <Text style={styles.actionText}>View</Text>
                  </Pressable>
                </View>
                <StatusBadge label="Demo" tone="amber" />
              </View>
            ))}
          </View>
        </SectionCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contactList: {
    gap: spacing.sm,
  },
  contactRow: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  contactTextBlock: {
    gap: 3,
  },
  contactLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  contactValue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  actionText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
});
