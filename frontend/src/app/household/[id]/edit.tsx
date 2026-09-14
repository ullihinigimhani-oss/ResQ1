import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
  getFamilyMemberById,
  isFamilyMemberApiError,
  updateFamilyMember,
} from '@/services/familyMemberService';
import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  MEDICAL_CONDITION_LABELS,
  VULNERABILITY_LABELS,
  type BloodGroup,
  type FamilyMemberFieldErrors,
  type Gender,
  type MedicalCondition,
  type VulnerabilityCategory,
} from '@/types/familyMember';

export default function EditFamilyMemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const memberId = Number.parseInt(id || '', 10);

  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [ageStr, setAgeStr] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nicIdNumber, setNicIdNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');

  const [vulnerableCategories, setVulnerableCategories] = useState<VulnerabilityCategory[]>([]);
  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>([]);
  const [disabilityDetails, setDisabilityDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FamilyMemberFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || Number.isNaN(memberId)) {
      setFetchError('Invalid family member ID.');
      setFetching(false);
      return;
    }

    let isMounted = true;

    getFamilyMemberById(token, memberId)
      .then((data) => {
        if (!isMounted) return;
        setName(data.name);
        setAgeStr(String(data.age));
        setGender(data.gender);
        setPhoneNumber(data.phoneNumber || '');
        setNicIdNumber(data.nicIdNumber || '');
        setBloodGroup(data.bloodGroup);
        setVulnerableCategories(data.vulnerableCategories || []);
        setMedicalConditions(data.medicalConditions || []);
        setDisabilityDetails(data.disabilityDetails || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        if (isFamilyMemberApiError(err)) {
          setFetchError(err.message);
        } else {
          setFetchError('Unable to load member data for editing.');
        }
      })
      .finally(() => {
        if (isMounted) setFetching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, memberId]);

  const numericAge = /^\d+$/.test(ageStr.trim()) ? Number.parseInt(ageStr.trim(), 10) : null;
  const isAdult = numericAge !== null && numericAge > 18;
  const isChildAge = numericAge !== null && numericAge <= 18;

  const hasMedicalCategory = vulnerableCategories.includes('PERSONS_WITH_MEDICAL_CONDITIONS');
  const hasDisabilityCategory = vulnerableCategories.includes('PERSONS_WITH_DISABILITIES');
  const showChildSuggestion = isChildAge && !vulnerableCategories.includes('CHILDREN');

  const toggleVulnerability = (cat: VulnerabilityCategory) => {
    setVulnerableCategories((prev) => {
      const exists = prev.includes(cat);
      if (exists) {
        const next = prev.filter((item) => item !== cat);
        if (cat === 'PERSONS_WITH_MEDICAL_CONDITIONS') {
          setMedicalConditions([]);
        }
        if (cat === 'PERSONS_WITH_DISABILITIES') {
          setDisabilityDetails('');
        }
        return next;
      }
      return [...prev, cat];
    });
  };

  const toggleMedicalCondition = (cond: MedicalCondition) => {
    setMedicalConditions((prev) =>
      prev.includes(cond) ? prev.filter((item) => item !== cond) : [...prev, cond],
    );
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    if (!token) {
      setErrorMessage('You must be logged in to update family members.');
      return;
    }

    const errors: FamilyMemberFieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (numericAge === null) {
      errors.age = 'Enter a valid non-negative age.';
    }

    if (isAdult && !nicIdNumber.trim()) {
      errors.nicIdNumber = 'NIC / ID number is required for members over 18 years old.';
    }

    if (hasMedicalCategory && medicalConditions.length === 0) {
      errors.medicalConditions =
        'Select at least one medical condition when "Persons with Medical Conditions" is selected.';
    }

    if (hasDisabilityCategory && !disabilityDetails.trim()) {
      errors.disabilityDetails =
        'Disability details are required when "Persons with Disabilities" is selected.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await updateFamilyMember(token, memberId, {
        name: name.trim(),
        age: numericAge as number,
        gender,
        phoneNumber: phoneNumber.trim() || null,
        nicIdNumber: nicIdNumber.trim() || null,
        bloodGroup,
        vulnerableCategories,
        medicalConditions: hasMedicalCategory ? medicalConditions : [],
        disabilityDetails: hasDisabilityCategory ? disabilityDetails.trim() : null,
      });

      router.replace('/household' as Href);
    } catch (err) {
      if (isFamilyMemberApiError(err)) {
        setErrorMessage(err.message);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
      } else {
        setErrorMessage('Failed to update family member. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading member information..." />
      </ScreenContainer>
    );
  }

  if (fetchError) {
    return (
      <ScreenContainer>
        <AppHeader
          eyebrow="Household"
          title="Edit Member"
          subtitle="Family member update"
          onBack={() => router.replace('/household' as Href)}
        />
        <StatusBanner message={fetchError} type="error" />
        <PrimaryButton
          title="Back to Household List"
          onPress={() => router.replace('/household' as Href)}
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
            eyebrow="Household Management"
            title={`Edit ${name || 'Member'}`}
            subtitle="Update family member information and vulnerability categories."
            onBack={() => router.back()}
          />

          {errorMessage ? <StatusBanner message={errorMessage} type="error" /> : null}

          {/* Member Basic Information */}
          <SectionCard title="Basic Information">
            <View style={styles.formGap}>
              <AuthTextField
                error={fieldErrors.name}
                label="Full Name *"
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Kamal Perera"
                value={name}
              />

              <AuthTextField
                error={fieldErrors.age}
                keyboardType="number-pad"
                label="Age *"
                maxLength={3}
                onChangeText={(val) => {
                  setAgeStr(val);
                  if (fieldErrors.age) setFieldErrors((prev) => ({ ...prev, age: undefined }));
                }}
                placeholder="e.g. 42"
                value={ageStr}
              />

              {/* Gender Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                <View style={styles.optionRow}>
                  {GENDER_OPTIONS.map((g) => {
                    const selected = gender === g;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={g}
                        onPress={() => setGender(g)}
                        style={({ pressed }) => [
                          styles.choiceChip,
                          selected && styles.choiceChipSelected,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.choiceChipText, selected && styles.choiceChipSelectedText]}>
                          {g}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {fieldErrors.gender ? <Text style={styles.errorText}>{fieldErrors.gender}</Text> : null}
              </View>

              {/* Blood Group Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Blood Group *</Text>
                <View style={styles.gridRow}>
                  {BLOOD_GROUP_OPTIONS.map((bg) => {
                    const selected = bloodGroup === bg;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={bg}
                        onPress={() => setBloodGroup(bg)}
                        style={({ pressed }) => [
                          styles.gridChip,
                          selected && styles.gridChipSelected,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.gridChipText, selected && styles.gridChipSelectedText]}>
                          {bg}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {fieldErrors.bloodGroup ? (
                  <Text style={styles.errorText}>{fieldErrors.bloodGroup}</Text>
                ) : null}
              </View>

              <AuthTextField
                error={fieldErrors.phoneNumber}
                keyboardType="phone-pad"
                label="Phone Number (Optional)"
                onChangeText={(val) => {
                  setPhoneNumber(val);
                  if (fieldErrors.phoneNumber)
                    setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                }}
                placeholder="e.g. 0771234567"
                value={phoneNumber}
              />

              {/* NIC Field with Dynamic Conditional Rule */}
              <AuthTextField
                error={fieldErrors.nicIdNumber}
                label={isAdult ? 'NIC / ID Number * (Required > 18)' : 'NIC / ID Number (Optional)'}
                onChangeText={(val) => {
                  setNicIdNumber(val);
                  if (fieldErrors.nicIdNumber)
                    setFieldErrors((prev) => ({ ...prev, nicIdNumber: undefined }));
                }}
                placeholder={isAdult ? 'Required for adults (e.g. 199012345678)' : 'Optional for <= 18'}
                value={nicIdNumber}
              />
            </View>
          </SectionCard>

          {/* Vulnerable Person Status */}
          <SectionCard title="Vulnerable Person Status">
            <Text style={styles.sectionHelpText}>
              Select all categories that apply to ensure priority evacuation support:
            </Text>

            {showChildSuggestion ? (
              <View style={styles.hintBanner}>
                <Text style={styles.hintText}>
                  💡 Member is age {numericAge}. You may want to select the "Children" category.
                </Text>
              </View>
            ) : null}

            <View style={styles.checkboxList}>
              {(
                [
                  'ELDERLY',
                  'CHILDREN',
                  'PREGNANT_WOMEN',
                  'PERSONS_WITH_DISABILITIES',
                  'PERSONS_WITH_MEDICAL_CONDITIONS',
                ] as VulnerabilityCategory[]
              ).map((cat) => {
                const checked = vulnerableCategories.includes(cat);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    key={cat}
                    onPress={() => toggleVulnerability(cat)}
                    style={({ pressed }) => [
                      styles.checkboxRow,
                      checked && styles.checkboxRowChecked,
                      pressed && styles.pressed,
                    ]}>
                    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
                      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={[styles.checkboxLabel, checked && styles.checkboxLabelChecked]}>
                      {VULNERABILITY_LABELS[cat]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          {/* Conditional Section: Medical Conditions */}
          {hasMedicalCategory ? (
            <SectionCard title="Medical Conditions *">
              <Text style={styles.sectionHelpText}>
                Select all pre-existing medical conditions for this family member:
              </Text>
              <View style={styles.checkboxList}>
                {(['DIABETES', 'ASTHMA', 'HEART_CONDITION'] as MedicalCondition[]).map((cond) => {
                  const checked = medicalConditions.includes(cond);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      key={cond}
                      onPress={() => toggleMedicalCondition(cond)}
                      style={({ pressed }) => [
                        styles.checkboxRow,
                        checked && styles.checkboxRowChecked,
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
                        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={[styles.checkboxLabel, checked && styles.checkboxLabelChecked]}>
                        {MEDICAL_CONDITION_LABELS[cond]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.medicalConditions ? (
                <Text style={styles.errorText}>{fieldErrors.medicalConditions}</Text>
              ) : null}
            </SectionCard>
          ) : null}

          {/* Conditional Section: Disability Details */}
          {hasDisabilityCategory ? (
            <SectionCard title="Disability Details *">
              <AuthTextField
                error={fieldErrors.disabilityDetails}
                label="Specify Disability Details *"
                onChangeText={(val) => {
                  setDisabilityDetails(val);
                  if (fieldErrors.disabilityDetails)
                    setFieldErrors((prev) => ({ ...prev, disabilityDetails: undefined }));
                }}
                placeholder="e.g. Mobility limitation, visual impairment, wheelchair user"
                value={disabilityDetails}
              />
            </SectionCard>
          ) : null}

          <View style={styles.submitContainer}>
            <PrimaryButton
              loading={loading}
              onPress={handleSubmit}
              title="Update Family Member"
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
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choiceChip: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  choiceChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  choiceChipText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  choiceChipSelectedText: {
    color: '#ffffff',
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
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gridChipSelected: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
  },
  gridChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  gridChipSelectedText: {
    color: colors.deepBlue,
  },
  sectionHelpText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  hintBanner: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginVertical: spacing.xs,
    padding: spacing.sm,
  },
  hintText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxList: {
    gap: 10,
    marginTop: spacing.xs,
  },
  checkboxRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkboxRowChecked: {
    backgroundColor: '#fffbe6',
    borderColor: '#f59e0b',
  },
  checkboxBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxBoxChecked: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  checkboxLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabelChecked: {
    color: colors.navy,
    fontWeight: '900',
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
