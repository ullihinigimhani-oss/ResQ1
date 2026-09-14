import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBanner } from '@/components/common/auth-components';
import {
  AppHeader,
  InfoRow,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  getFamilyMemberById,
  isFamilyMemberApiError,
} from '@/services/familyMemberService';
import {
  MEDICAL_CONDITION_LABELS,
  VULNERABILITY_LABELS,
  type FamilyMember,
} from '@/types/familyMember';

export default function FamilyMemberDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberId = Number.parseInt(id || '', 10);

  useEffect(() => {
    if (!token || Number.isNaN(memberId)) {
      setError('Invalid family member ID.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    getFamilyMemberById(token, memberId)
      .then((data) => {
        if (isMounted) {
          setMember(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (isFamilyMemberApiError(err)) {
            setError(err.message);
          } else {
            setError('Unable to load member details. Please try again.');
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, memberId]);

  if (loading) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading family member details..." />
      </ScreenContainer>
    );
  }

  if (error || !member) {
    return (
      <ScreenContainer>
        <AppHeader
          eyebrow="Household"
          title="Member Details"
          subtitle="Family member view"
          onBack={() => router.replace('/household' as Href)}
        />
        <StatusBanner message={error || 'Member not found.'} type="error" />
        <PrimaryButton
          title="Back to Household List"
          onPress={() => router.replace('/household' as Href)}
        />
      </ScreenContainer>
    );
  }

  const isVulnerable = member.vulnerableCategories.length > 0;

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Household Management"
        title={member.name}
        subtitle="Individual family member profile and emergency vulnerability summary."
        onBack={() => router.replace('/household' as Href)}
      />

      <SectionCard title="Personal Information">
        <View style={styles.badgeRow}>
          <StatusBadge
            label={isVulnerable ? 'Vulnerable Priority' : 'Standard Priority'}
            tone={isVulnerable ? 'amber' : 'blue'}
          />
        </View>

        <InfoRow label="Full Name" value={member.name} />
        <InfoRow label="Age" value={`${member.age} years old`} />
        <InfoRow label="Gender" value={member.gender} />
        <InfoRow label="Blood Group" value={member.bloodGroup} />
        <InfoRow label="Phone Number" value={member.phoneNumber || 'Not provided'} />
        <InfoRow label="NIC / ID Number" value={member.nicIdNumber || 'Not provided'} />
      </SectionCard>

      {/* Vulnerability Categories Section */}
      <SectionCard title="Vulnerability Status">
        {member.vulnerableCategories.length === 0 ? (
          <Text style={styles.noneText}>No vulnerability categories assigned.</Text>
        ) : (
          <View style={styles.badgeChipsRow}>
            {member.vulnerableCategories.map((cat) => (
              <View key={cat} style={styles.chip}>
                <Text style={styles.chipIcon}>⚠️</Text>
                <Text style={styles.chipText}>{VULNERABILITY_LABELS[cat]}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      {/* Pre-existing Medical Conditions Section */}
      {member.medicalConditions.length > 0 ? (
        <SectionCard title="Medical Conditions">
          <View style={styles.listBlock}>
            {member.medicalConditions.map((cond) => (
              <View key={cond} style={styles.listItem}>
                <Text style={styles.bulletIcon}>🩺</Text>
                <Text style={styles.listText}>{MEDICAL_CONDITION_LABELS[cond]}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {/* Disability Details Section */}
      {member.disabilityDetails ? (
        <SectionCard title="Disability Information">
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxIcon}>♿</Text>
            <Text style={styles.infoBoxText}>{member.disabilityDetails}</Text>
          </View>
        </SectionCard>
      ) : null}

      <View style={styles.btnRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/household/${member.id}/edit` as Href)}
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
          <Text style={styles.editBtnText}>Edit Member</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/household' as Href)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backBtnText}>Back to List</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    marginBottom: spacing.sm,
  },
  noneText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  badgeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    borderColor: '#f59e0b',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '800',
  },
  listBlock: {
    gap: 8,
  },
  listItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bulletIcon: {
    fontSize: 14,
  },
  listText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: spacing.md,
  },
  infoBoxIcon: {
    fontSize: 18,
  },
  infoBoxText: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  editBtn: {
    alignItems: 'center',
    backgroundColor: '#d97706',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.navy,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  backBtnText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
