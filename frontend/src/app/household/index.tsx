import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  deleteFamilyMember,
  getFamilyMembers,
  isFamilyMemberApiError,
} from '@/services/familyMemberService';
import {
  MEDICAL_CONDITION_LABELS,
  VULNERABILITY_LABELS,
  type FamilyMember,
} from '@/types/familyMember';

export default function HouseholdScreen() {
  const router = useRouter();
  const { isLoading: isAuthLoading, user, token } = useAuth();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getFamilyMembers(token);
      setMembers(data);
    } catch (err) {
      if (isFamilyMemberApiError(err)) {
        setError(err.message);
      } else {
        setError('Unable to load family members. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers]),
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    setStatusMessage(null);

    try {
      const result = await deleteFamilyMember(token, deleteTarget.id);
      setStatusMessage({ type: 'success', text: result.message });
      setDeleteTarget(null);
      await fetchMembers();
    } catch (err) {
      if (isFamilyMemberApiError(err)) {
        setStatusMessage({ type: 'error', text: err.message });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to remove family member. Please try again.' });
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isAuthLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading household information..." />
      </ScreenContainer>
    );
  }

  const vulnerableMembersCount = members.filter(
    (m) => m.vulnerableCategories.length > 0 || m.medicalConditions.length > 0 || m.disabilityDetails,
  ).length;

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Resident Preparedness"
        title="Household Info"
        subtitle="Manage family members living in your household to ensure priority evacuation support."
        onBack={() => router.replace('/profile' as Href)}
      />

      {statusMessage ? (
        <StatusBanner message={statusMessage.text} type={statusMessage.type} />
      ) : null}

      <SectionCard title="Household Summary">
        <InfoRow label="Head of Household" value={user.fullName} />
        <InfoRow label="Home Address" value={user.location || 'Address not configured'} />
        <InfoRow label="Total Family Members" value={String(members.length)} />
        <InfoRow label="Vulnerable Members" value={String(vulnerableMembersCount)} />
      </SectionCard>

      <SectionCard title="Family Members">
        <View style={styles.headerActionRow}>
          <Text style={styles.sectionSubtitle}>
            {members.length === 1 ? '1 Registered Member' : `${members.length} Registered Members`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/household/add-member' as Href)}
            style={({ pressed }) => [styles.addSmallBtn, pressed && styles.pressed]}>
            <Text style={styles.addSmallBtnText}>+ Add Member</Text>
          </Pressable>
        </View>

        {loading ? (
          <LoadingState message="Loading family members..." />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <PrimaryButton title="Retry" onPress={fetchMembers} />
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No family members added yet</Text>
            <Text style={styles.emptySubtext}>
              Add members living under your household so disaster response teams can prioritize assistance.
            </Text>
            <PrimaryButton
              title="+ Add Family Member"
              onPress={() => router.push('/household/add-member' as Href)}
            />
          </View>
        ) : (
          <View style={styles.memberList}>
            {members.map((member) => {
              const isVulnerable = member.vulnerableCategories.length > 0;

              return (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.memberMainInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberMeta}>
                        Age: {member.age} • {member.gender} • Blood: {member.bloodGroup}
                      </Text>
                    </View>
                    <StatusBadge
                      label={isVulnerable ? 'Vulnerable' : 'Standard'}
                      tone={isVulnerable ? 'amber' : 'blue'}
                    />
                  </View>

                  {member.nicIdNumber ? (
                    <Text style={styles.nicText}>NIC / ID: {member.nicIdNumber}</Text>
                  ) : null}

                  {/* Vulnerability chips display */}
                  {isVulnerable ? (
                    <View style={styles.badgeChipsRow}>
                      {member.vulnerableCategories.map((cat) => (
                        <View key={cat} style={styles.chip}>
                          <Text style={styles.chipIcon}>⚠️</Text>
                          <Text style={styles.chipText}>{VULNERABILITY_LABELS[cat]}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Medical conditions list */}
                  {member.medicalConditions.length > 0 ? (
                    <View style={styles.detailsSubRow}>
                      <Text style={styles.detailsSubLabel}>🩺 Medical:</Text>
                      <Text style={styles.detailsSubValue}>
                        {member.medicalConditions.map((c) => MEDICAL_CONDITION_LABELS[c]).join(', ')}
                      </Text>
                    </View>
                  ) : null}

                  {/* Disability details */}
                  {member.disabilityDetails ? (
                    <View style={styles.detailsSubRow}>
                      <Text style={styles.detailsSubLabel}>♿ Disability:</Text>
                      <Text style={styles.detailsSubValue}>{member.disabilityDetails}</Text>
                    </View>
                  ) : null}

                  {/* Card Action Buttons */}
                  <View style={styles.cardActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/household/${member.id}` as Href)}
                      style={({ pressed }) => [styles.actionBtn, styles.viewBtn, pressed && styles.pressed]}>
                      <Text style={styles.viewBtnText}>View</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/household/${member.id}/edit` as Href)}
                      style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && styles.pressed]}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setDeleteTarget(member)}
                      style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.pressed]}>
                      <Text style={styles.deleteBtnText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={deleteTarget !== null}
        onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove Family Member?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to remove{' '}
              <Text style={styles.boldText}>{deleteTarget?.name}</Text> from your household records? This action cannot be undone.
            </Text>

            <View style={styles.modalBtnRow}>
              <Pressable
                disabled={deleting}
                onPress={() => setDeleteTarget(null)}
                style={({ pressed }) => [styles.cancelModalBtn, pressed && styles.pressed]}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={deleting}
                onPress={handleDeleteConfirm}
                style={({ pressed }) => [styles.confirmModalBtn, pressed && styles.pressed]}>
                {deleting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.confirmModalBtnText}>Remove</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  addSmallBtn: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addSmallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  memberList: {
    gap: spacing.md,
  },
  memberCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberMainInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  memberMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  nicText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    borderColor: '#f59e0b',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipIcon: {
    fontSize: 11,
  },
  chipText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800',
  },
  detailsSubRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  detailsSubLabel: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '800',
  },
  detailsSubValue: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  cardActions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewBtn: {
    backgroundColor: colors.white,
    borderColor: colors.navy,
    borderWidth: 1,
  },
  viewBtnText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '800',
  },
  editBtn: {
    backgroundColor: colors.white,
    borderColor: '#d97706',
    borderWidth: 1,
  },
  editBtnText: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  emptySubtext: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    gap: spacing.md,
    maxWidth: 400,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  boldText: {
    color: colors.navy,
    fontWeight: '900',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  cancelModalBtn: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelModalBtnText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  confirmModalBtn: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
