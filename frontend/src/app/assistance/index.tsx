import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthTextField, StatusBanner } from '@/components/common/auth-components';
import {
  AppHeader,
  DemoNotice,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  SegmentedOptions,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import type { AssistanceDraft } from '@/services/futureServices';

const emergencyTypes = ['Rescue', 'Medical', 'Flood', 'Trapped', 'Other'] as const;
const urgencyLevels = ['Moderate', 'High', 'Critical'] as const;
const specialNeeds = ['Medical Care', 'Mobility', 'Child Care', 'Elderly Care'] as const;

const initialDraft: AssistanceDraft = {
  emergencyType: 'Rescue',
  urgency: 'High',
  location: '',
  adults: '1',
  children: '0',
  elderly: '0',
  details: '',
  contactNumber: '',
  specialNeeds: [],
};

export default function AssistanceScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [draft, setDraft] = useState<AssistanceDraft>(initialDraft);
  const [message, setMessage] = useState<string | null>(null);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Opening assistance request..." />
      </ScreenContainer>
    );
  }

  const update = (field: keyof AssistanceDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const toggleNeed = (need: string) => {
    setDraft((current) => ({
      ...current,
      specialNeeds: current.specialNeeds.includes(need)
        ? current.specialNeeds.filter((item) => item !== need)
        : [...current.specialNeeds, need],
    }));
  };

  const validate = () => {
    if (!draft.location.trim()) {
      setMessage('Please enter your current location before preparing the request.');
      return;
    }

    if (!draft.details.trim()) {
      setMessage('Please describe the emergency details.');
      return;
    }

    if (!draft.contactNumber.trim()) {
      setMessage('Please enter a contact number.');
      return;
    }

    setMessage('Emergency assistance backend is not yet enabled. This request was validated locally but was not sent to authorities.');
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Emergency Assistance"
        title="Request Assistance"
        subtitle="Prepare urgent help details without claiming backend dispatch."
        onBack={() => router.replace('/dashboard' as Href)}
      />

      <DemoNotice text="No assistance endpoint exists in Sprint 1. The form validates locally and does not send data to emergency services." />
      {message ? <StatusBanner message={message} type="error" /> : null}

      <SectionCard title="Emergency Type">
        <SegmentedOptions
          options={emergencyTypes}
          value={draft.emergencyType as (typeof emergencyTypes)[number]}
          onChange={(value) => update('emergencyType', value)}
        />
      </SectionCard>

      <SectionCard title="Urgency">
        <SegmentedOptions
          options={urgencyLevels}
          value={draft.urgency as (typeof urgencyLevels)[number]}
          onChange={(value) => update('urgency', value)}
        />
      </SectionCard>

      <SectionCard title="Location">
        <AuthTextField
          label="Current Location"
          onChangeText={(value) => update('location', value)}
          placeholder="Road, area, landmark"
          value={draft.location}
        />
      </SectionCard>

      <SectionCard title="People Requiring Assistance">
        <View style={styles.peopleGrid}>
          <AuthTextField label="Adults" keyboardType="number-pad" value={draft.adults} onChangeText={(value) => update('adults', value)} />
          <AuthTextField label="Children" keyboardType="number-pad" value={draft.children} onChangeText={(value) => update('children', value)} />
          <AuthTextField label="Elderly" keyboardType="number-pad" value={draft.elderly} onChangeText={(value) => update('elderly', value)} />
        </View>
      </SectionCard>

      <SectionCard title="Special Needs">
        <View style={styles.needGrid}>
          {specialNeeds.map((need) => {
            const selected = draft.specialNeeds.includes(need);

            return (
              <Text
                key={need}
                onPress={() => toggleNeed(need)}
                style={[styles.needChip, selected && styles.needChipSelected]}>
                {need}
              </Text>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Emergency Details">
        <AuthTextField
          label="Details"
          multiline
          numberOfLines={5}
          onChangeText={(value) => update('details', value)}
          placeholder="Describe what is happening, access issues, and immediate risks."
          textAlignVertical="top"
          value={draft.details}
        />
        <DemoNotice text="Optional photo attachment can be added from the incident photo workflow when secure storage is available." />
      </SectionCard>

      <SectionCard title="Contact Number">
        <AuthTextField
          label="Contact Number"
          keyboardType="phone-pad"
          onChangeText={(value) => update('contactNumber', value)}
          placeholder="Your reachable number"
          value={draft.contactNumber}
        />
      </SectionCard>

      <View style={styles.submitBlock}>
        <StatusBadge label="Backend Not Enabled" tone="amber" />
        <PrimaryButton title="Send Emergency Request" tone="red" onPress={validate} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  peopleGrid: {
    gap: spacing.sm,
  },
  needGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  needChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  needChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
    color: colors.white,
  },
  submitBlock: {
    gap: spacing.sm,
  },
});
