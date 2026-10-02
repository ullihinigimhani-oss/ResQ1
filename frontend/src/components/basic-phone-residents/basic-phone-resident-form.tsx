import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthTextField, StatusBanner } from '@/components/common/auth-components';
import { PrimaryButton, SecondaryButton, SectionCard } from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getAvailableAlertAreas } from '@/services/alertService';
import {
  isBasicPhoneResidentApiError,
} from '@/services/basicPhoneResidentService';
import type {
  BasicPhoneResidentFieldErrors,
  BasicPhoneResidentPayload,
} from '@/types/basicPhoneResident';

type BasicPhoneResidentFormProps = {
  initialValues?: BasicPhoneResidentPayload;
  onCancel: () => void;
  onSubmit: (payload: BasicPhoneResidentPayload) => Promise<void>;
  submitTitle: string;
};

function normalizeMobileNumber(value: string) {
  return value.trim().replace(/[\s-]+/g, '');
}

export function BasicPhoneResidentForm({
  initialValues = { fullName: '', mobileNumber: '', area: '' },
  onCancel,
  onSubmit,
  submitTitle,
}: BasicPhoneResidentFormProps) {
  const { token } = useAuth();
  const [fullName, setFullName] = useState(initialValues.fullName);
  const [mobileNumber, setMobileNumber] = useState(initialValues.mobileNumber);
  const [area, setArea] = useState(initialValues.area);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(Boolean(token));
  const [areaWarning, setAreaWarning] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BasicPhoneResidentFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!token) {
      return () => {
        active = false;
      };
    }

    getAvailableAlertAreas(token)
      .then((areas) => {
        if (active) {
          setAvailableAreas(areas);
          setAreaWarning(null);
        }
      })
      .catch(() => {
        if (active) {
          setAreaWarning('Area suggestions are unavailable. You can still enter an area.');
        }
      })
      .finally(() => {
        if (active) {
          setLoadingAreas(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const matchingAreas = useMemo(() => {
    const query = area.trim().toLowerCase();

    return availableAreas
      .filter((option) => (
        (!query || option.toLowerCase().includes(query))
        && option.toLowerCase() !== query
      ))
      .slice(0, 6);
  }, [area, availableAreas]);

  const clearFieldError = (field: keyof BasicPhoneResidentFieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setErrorMessage(null);
  };

  const submit = async () => {
    if (submitting) {
      return;
    }

    const normalizedMobileNumber = normalizeMobileNumber(mobileNumber);
    const nextErrors: BasicPhoneResidentFieldErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!/^07\d{8}$/.test(normalizedMobileNumber)) {
      nextErrors.mobileNumber = 'Enter a valid Sri Lankan mobile number.';
    }

    if (!area.trim()) {
      nextErrors.area = 'Area is required.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setErrorMessage('Please correct the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      await onSubmit({
        fullName: fullName.trim(),
        mobileNumber: normalizedMobileNumber,
        area: area.trim(),
      });
    } catch (error) {
      if (isBasicPhoneResidentApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to save this resident. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      {errorMessage ? <StatusBanner message={errorMessage} type="error" /> : null}

      <SectionCard
        title="Resident Information"
        subtitle="This creates an emergency contact record, not a ResQ1 login account.">
        <View style={styles.fields}>
          <AuthTextField
            autoCapitalize="words"
            error={fieldErrors.fullName}
            label="Full Name *"
            maxLength={100}
            onChangeText={(value) => {
              setFullName(value);
              clearFieldError('fullName');
            }}
            placeholder="e.g. Kamal Perera"
            value={fullName}
          />

          <AuthTextField
            error={fieldErrors.mobileNumber}
            keyboardType="phone-pad"
            label="Mobile Number *"
            maxLength={16}
            onChangeText={(value) => {
              setMobileNumber(value);
              clearFieldError('mobileNumber');
            }}
            placeholder="e.g. 0771234567"
            value={mobileNumber}
          />
          <Text style={styles.helpText}>Use a Sri Lankan mobile number in 07XXXXXXXX format.</Text>

          <AuthTextField
            autoCapitalize="words"
            error={fieldErrors.area}
            label="Area *"
            maxLength={150}
            onChangeText={(value) => {
              setArea(value);
              clearFieldError('area');
            }}
            placeholder="Enter the resident's area"
            value={area}
          />

          {loadingAreas ? <Text style={styles.suggestionHint}>Loading area suggestions...</Text> : null}
          {areaWarning ? <Text style={styles.areaWarning}>{areaWarning}</Text> : null}
          {!loadingAreas && matchingAreas.length > 0 ? (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionHint}>Available areas</Text>
              {matchingAreas.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option}
                  onPress={() => {
                    setArea(option);
                    clearFieldError('area');
                  }}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}>
                  <Text numberOfLines={2} style={styles.suggestionText}>{option}</Text>
                  <Text style={styles.suggestionAction}>Select</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </SectionCard>

      <View style={styles.actions}>
        <SecondaryButton disabled={submitting} onPress={onCancel} title="Cancel" />
        <PrimaryButton loading={submitting} onPress={() => void submit()} title={submitTitle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  fields: {
    gap: spacing.md,
  },
  helpText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -spacing.sm,
  },
  suggestions: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionHint: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
  },
  suggestionRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  suggestionAction: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '700',
  },
  areaWarning: {
    color: colors.amberText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  actions: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
