import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { AuthTextField, StatusBanner } from '@/components/common/auth-components';
import {
  AppHeader,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  getEmergencyContactById,
  isEmergencyContactApiError,
  updateEmergencyContact,
} from '@/services/emergencyContactService';
import {
  RELATIONSHIP_OPTIONS,
  type EmergencyContactFieldErrors,
  type RelationshipType,
} from '@/types/emergencyContact';

export default function EditEmergencyContactScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const contactId = Number.parseInt(id || '', 10);

  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType | string>('Spouse');
  const [customRelationship, setCustomRelationship] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<EmergencyContactFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || Number.isNaN(contactId)) {
      setFetchError('Invalid emergency contact ID.');
      setFetching(false);
      return;
    }

    let isMounted = true;

    getEmergencyContactById(token, contactId)
      .then((data) => {
        if (!isMounted) return;
        setName(data.name);
        setPhoneNumber(data.phoneNumber);
        if (RELATIONSHIP_OPTIONS.includes(data.relationship as RelationshipType)) {
          setRelationship(data.relationship as RelationshipType);
        } else {
          setRelationship('Other');
          setCustomRelationship(data.relationship);
        }
        setIsPrimary(data.isPrimary);
        setNotes(data.notes || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        if (isEmergencyContactApiError(err)) {
          setFetchError(err.message);
        } else {
          setFetchError('Unable to load contact information for editing.');
        }
      })
      .finally(() => {
        if (isMounted) setFetching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, contactId]);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    if (!token) {
      setErrorMessage('You must be logged in to update emergency contacts.');
      return;
    }

    const selectedRel = relationship === 'Other' ? customRelationship.trim() : relationship;

    const errors: EmergencyContactFieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Contact name is required.';
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Contact phone number is required.';
    }

    if (!selectedRel) {
      errors.relationship = 'Please select or specify a relationship.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await updateEmergencyContact(token, contactId, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        relationship: selectedRel,
        isPrimary,
        notes: notes.trim() || null,
      });

      router.replace('/emergency-contacts' as Href);
    } catch (err) {
      if (isEmergencyContactApiError(err)) {
        setErrorMessage(err.message);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
      } else {
        setErrorMessage('Failed to update emergency contact. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading contact information..." />
      </ScreenContainer>
    );
  }

  if (fetchError) {
    return (
      <ScreenContainer>
        <AppHeader
          eyebrow="Personal Safety"
          title="Edit Contact"
          subtitle="Emergency contact update"
          onBack={() => router.replace('/emergency-contacts' as Href)}
        />
        <StatusBanner message={fetchError} type="error" />
        <PrimaryButton
          title="Back to Emergency Contacts"
          onPress={() => router.replace('/emergency-contacts' as Href)}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <AppHeader
            eyebrow="Personal Safety"
            title={`Edit ${name || 'Contact'}`}
            subtitle="Update trusted contact information and priority status."
            onBack={() => router.back()}
          />

          {errorMessage ? <StatusBanner message={errorMessage} type="error" /> : null}

          <SectionCard title="Contact Information">
            <View style={styles.formGap}>
              <AuthTextField
                error={fieldErrors.name}
                label="Full Name *"
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Sunethra Perera"
                value={name}
              />

              <AuthTextField
                error={fieldErrors.phoneNumber}
                keyboardType="phone-pad"
                label="Contact Phone Number *"
                onChangeText={(val) => {
                  setPhoneNumber(val);
                  if (fieldErrors.phoneNumber)
                    setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                }}
                placeholder="e.g. 0771234567"
                value={phoneNumber}
              />

              {/* Relationship Chips */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Relationship *</Text>
                <View style={styles.gridRow}>
                  {RELATIONSHIP_OPTIONS.map((rel) => {
                    const selected = relationship === rel;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={rel}
                        onPress={() => setRelationship(rel)}
                        style={({ pressed }) => [
                          styles.gridChip,
                          selected && styles.gridChipSelected,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.gridChipText, selected && styles.gridChipSelectedText]}>
                          {rel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {fieldErrors.relationship ? (
                  <Text style={styles.errorText}>{fieldErrors.relationship}</Text>
                ) : null}
              </View>

              {relationship === 'Other' ? (
                <AuthTextField
                  error={fieldErrors.relationship}
                  label="Specify Relationship *"
                  onChangeText={setCustomRelationship}
                  placeholder="e.g. Landlord, Caregiver"
                  value={customRelationship}
                />
              ) : null}
            </View>
          </SectionCard>

          {/* Priority & Notes Section */}
          <SectionCard title="Priority & Notes">
            <View style={styles.formGap}>
              <View style={styles.switchRow}>
                <View style={styles.switchTextBlock}>
                  <Text style={styles.switchLabel}>Primary Emergency Contact</Text>
                  <Text style={styles.switchHelp}>
                    Mark as the #1 first-priority contact for emergency notifications.
                  </Text>
                </View>
                <Switch
                  onValueChange={setIsPrimary}
                  thumbColor={isPrimary ? '#ffffff' : '#f4f3f4'}
                  trackColor={{ false: '#d1d5db', true: colors.primaryAction }}
                  value={isPrimary}
                />
              </View>

              <AuthTextField
                error={fieldErrors.notes}
                label="Additional Notes (Optional)"
                onChangeText={(val) => {
                  setNotes(val);
                  if (fieldErrors.notes) setFieldErrors((prev) => ({ ...prev, notes: undefined }));
                }}
                placeholder="e.g. Lives next door, has spare key, speaks English"
                value={notes}
              />
            </View>
          </SectionCard>

          <View style={styles.submitContainer}>
            <PrimaryButton
              loading={loading}
              onPress={handleSubmit}
              title="Update Emergency Contact"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  formGap: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '400',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridChip: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gridChipSelected: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.primaryAction,
  },
  gridChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  gridChipSelectedText: {
    color: '#ffffff',
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  switchTextBlock: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  switchLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '600',
  },
  switchHelp: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  submitContainer: {
    marginVertical: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
