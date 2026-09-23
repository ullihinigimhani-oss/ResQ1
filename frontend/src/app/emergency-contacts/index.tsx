import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
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
  deleteEmergencyContact,
  getEmergencyContacts,
  isEmergencyContactApiError,
} from '@/services/emergencyContactService';
import type { EmergencyContact } from '@/types/emergencyContact';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const { isLoading: isAuthLoading, user, token } = useAuth();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getEmergencyContacts(token);
      setContacts(data);
    } catch (err) {
      if (isEmergencyContactApiError(err)) {
        setError(err.message);
      } else {
        setError('Unable to load emergency contacts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [fetchContacts]),
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    setStatusMessage(null);

    try {
      const result = await deleteEmergencyContact(token, deleteTarget.id);
      setStatusMessage({ type: 'success', text: result.message });
      setDeleteTarget(null);
      await fetchContacts();
    } catch (err) {
      if (isEmergencyContactApiError(err)) {
        setStatusMessage({ type: 'error', text: err.message });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to remove contact. Please try again.' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    if (cleaned) {
      Linking.openURL(`tel:${cleaned}`).catch(() => {
        setStatusMessage({ type: 'error', text: `Could not dial ${phoneNumber} automatically.` });
      });
    }
  };

  if (!isAuthLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isAuthLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading emergency contacts..." />
      </ScreenContainer>
    );
  }

  const primaryContact = contacts.find((c) => c.isPrimary);

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Personal Safety"
        title="Emergency Contacts"
        subtitle="Manage trusted contacts for quick communication during emergency situations."
        onBack={() => router.replace('/profile' as Href)}
      />

      {statusMessage ? (
        <StatusBanner message={statusMessage.text} type={statusMessage.type} />
      ) : null}

      <SectionCard title="Quick Emergency Info">
        <InfoRow label="Resident Account" value={user.fullName} />
        <InfoRow label="Registered Area" value={user.location || 'Not set'} />
        <InfoRow label="Total Trusted Contacts" value={String(contacts.length)} />
        <InfoRow
          label="Primary Emergency Contact"
          value={primaryContact ? `${primaryContact.name} (${primaryContact.phoneNumber})` : 'None designated'}
        />
      </SectionCard>

      <SectionCard title="Trusted Contacts">
        <View style={styles.headerActionRow}>
          <Text style={styles.sectionSubtitle}>
            {contacts.length === 1 ? '1 Saved Contact' : `${contacts.length} Saved Contacts`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/emergency-contacts/add' as Href)}
            style={({ pressed }) => [styles.addSmallBtn, pressed && styles.pressed]}>
            <Text style={styles.addSmallBtnText}>+ Add Contact</Text>
          </Pressable>
        </View>

        {loading ? (
          <LoadingState message="Loading emergency contacts..." />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <PrimaryButton title="Retry" onPress={fetchContacts} />
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No emergency contacts added</Text>
            <Text style={styles.emptySubtext}>
              Add trusted family members, neighbors, or friends so emergency responders can reach them quickly.
            </Text>
          </View>
        ) : (
          <View style={styles.contactList}>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.contactMainInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.isPrimary ? (
                        <StatusBadge label="PRIMARY" tone="amber" />
                      ) : null}
                    </View>
                    <Text style={styles.contactRelationship}>
                      {contact.relationship} • {contact.phoneNumber}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleCall(contact.phoneNumber)}
                    style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
                    <Text style={styles.callBtnText}>📞 Call</Text>
                  </Pressable>
                </View>

                {contact.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>📝 {contact.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/emergency-contacts/${contact.id}/edit` as Href)}
                    style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && styles.pressed]}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeleteTarget(contact)}
                    style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.pressed]}>
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
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
            <Text style={styles.modalTitle}>Remove Emergency Contact?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to remove{' '}
              <Text style={styles.boldText}>{deleteTarget?.name}</Text> ({deleteTarget?.relationship}) from your trusted contacts list?
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
    fontWeight: '400',
  },
  addSmallBtn: {
    backgroundColor: colors.primaryAction,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addSmallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  contactList: {
    gap: spacing.md,
  },
  contactCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactMainInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contactName: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '700',
  },
  contactRelationship: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  callBtn: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  callBtnText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: '#fffbe6',
    borderColor: '#f59e0b',
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: 4,
    padding: spacing.sm,
  },
  notesText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
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
  editBtn: {
    backgroundColor: colors.white,
    borderColor: '#d97706',
    borderWidth: 1,
  },
  editBtnText: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '400',
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
    fontWeight: '700',
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  boldText: {
    color: colors.navy,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
