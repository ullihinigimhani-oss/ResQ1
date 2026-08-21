import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBanner } from '@/components/common/auth-components';
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
import { demoHouseholdMembers } from '@/services/futureServices';

export default function HouseholdScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading household information..." />
      </ScreenContainer>
    );
  }

  const vulnerableCount = demoHouseholdMembers.filter((member) => member.vulnerability !== 'None').length;

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Resident Preparedness"
        title="Household Info"
        subtitle="Demo-only household structure prepared for a future household service."
        onBack={() => router.replace('/profile' as Href)}
      />

      <DemoNotice text="Household backend tables/services are not implemented in Sprint 1. This screen uses isolated demo data only and does not write to Neon." />
      {message ? <StatusBanner message={message} type="error" /> : null}

      <SectionCard title="Summary">
        <InfoRow label="Home Address" value={user.location || 'Address not configured'} />
        <InfoRow label="Household ID" value="Not available in Sprint 1" />
        <InfoRow label="Total Members" value={String(demoHouseholdMembers.length)} />
        <InfoRow label="Vulnerable Members" value={String(vulnerableCount)} />
      </SectionCard>

      <SectionCard title="Household Members">
        <View style={styles.memberList}>
          {demoHouseholdMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberTextBlock}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta}>{member.relationship} | Age {member.age}</Text>
              </View>
              <StatusBadge label={member.vulnerability} tone={member.vulnerability === 'Child' ? 'blue' : 'amber'} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Emergency Contact">
        <InfoRow label="Primary Contact" value={user.fullName} />
        <InfoRow label="Contact Number" value="Not configured" />
      </SectionCard>

      <PrimaryButton
        title="Add Household Member"
        onPress={() => setMessage('Household member persistence is not enabled yet. No data was saved.')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  memberList: {
    gap: spacing.sm,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  memberTextBlock: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  memberMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
});
