import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthButton,
  AuthTextField,
  BackButton,
  StatusBanner,
} from '@/components/common/auth-components';
import { RiskBadge } from '@/components/alerts/alert-badges';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { createAlert, isAlertApiError } from '@/services/alertService';
import {
  alertRiskLevels,
  type AlertFieldErrors,
  type AlertRiskLevel,
  type CreateAlertPayload,
} from '@/types/alert';

type AlertForm = {
  title: string;
  affectedArea: string;
  riskLevel: AlertRiskLevel | '';
  message: string;
  safetyInstructions: string;
  expiresAt: string;
};

const initialForm: AlertForm = {
  title: '',
  affectedArea: '',
  riskLevel: '',
  message: '',
  safetyInstructions: '',
  expiresAt: '',
};

function canPublishAlerts(role: string) {
  return role === 'admin' || role === 'authority';
}

function formatExpiration(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'No expiration set';
  }

  const date = new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    return trimmedValue;
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function previewText(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'Not entered';
  }

  if (trimmedValue.length <= 118) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, 115).trim()}...`;
}

function validateForm(form: AlertForm) {
  const errors: AlertFieldErrors = {};
  const title = form.title.trim();
  const affectedArea = form.affectedArea.trim();
  const message = form.message.trim();
  const safetyInstructions = form.safetyInstructions.trim();
  const expiresAtText = form.expiresAt.trim();
  let expiresAt: string | null = null;

  if (!title) {
    errors.title = 'Please enter an alert title.';
  }

  if (!affectedArea) {
    errors.affectedArea = 'Please enter the affected area.';
  }

  if (!form.riskLevel) {
    errors.riskLevel = 'Please select a risk level.';
  }

  if (!message) {
    errors.message = 'Please enter the warning message.';
  }

  if (!safetyInstructions) {
    errors.safetyInstructions = 'Please provide safety instructions.';
  }

  if (expiresAtText) {
    const expirationDate = new Date(expiresAtText);
    const expirationTime = expirationDate.getTime();

    if (!Number.isFinite(expirationTime)) {
      errors.expiresAt = 'Expiration time must be a valid date and time.';
    } else if (expirationTime <= Date.now()) {
      errors.expiresAt = 'Expiration time must be in the future.';
    } else {
      expiresAt = expirationDate.toISOString();
    }
  }

  const payload: CreateAlertPayload = {
    title,
    disasterType: 'Flood',
    affectedArea,
    riskLevel: form.riskLevel as AlertRiskLevel,
    message,
    safetyInstructions,
    expiresAt,
  };

  return {
    errors,
    payload,
  };
}

function confirmPublish(onConfirm: () => void) {
  const message = 'Residents in the affected area may immediately see this verified disaster warning.';

  if (Platform.OS === 'web') {
    const webConfirm = (globalThis as typeof globalThis & { confirm?: (message: string) => boolean }).confirm;

    if (typeof webConfirm === 'function') {
      if (webConfirm(`Publish this emergency alert?\n\n${message}`)) {
        onConfirm();
      }

      return;
    }
  }

  NativeAlert.alert('Publish this emergency alert?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Publish Alert', style: 'destructive', onPress: onConfirm },
  ]);
}

function FormSection({
  children,
  helper,
  title,
}: {
  children: ReactNode;
  helper?: string;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {helper ? <Text style={styles.sectionHelper}>{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PrePublishSummary({ form }: { form: AlertForm }) {
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewEyebrow}>Pre-Publish Summary</Text>
      <SummaryRow label="Title" value={form.title.trim() || 'Not entered'} />
      <SummaryRow label="Affected Area" value={form.affectedArea.trim() || 'Not entered'} />
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Risk Level</Text>
        {form.riskLevel ? (
          <RiskBadge riskLevel={form.riskLevel} />
        ) : (
          <Text style={styles.summaryValue}>Not selected</Text>
        )}
      </View>
      <SummaryRow label="Message Preview" value={previewText(form.message)} />
      <SummaryRow label="Expiration" value={formatExpiration(form.expiresAt)} />
    </View>
  );
}

export default function CreateAlertScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [form, setForm] = useState<AlertForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<AlertFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BrandColors.red} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const authorized = canPublishAlerts(user.role);

  const updateField = (field: keyof AlertForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const publishAlert = async (payload: CreateAlertPayload) => {
    if (!token) {
      setMessage('Please log in to publish an emergency alert.');
      return;
    }

    setSubmitting(true);

    try {
      const createdAlert = await createAlert(payload, token);
      router.replace({
        pathname: '/alerts/[id]',
        params: { id: String(createdAlert.id), published: '1' },
      } as unknown as Href);
    } catch (error) {
      if (isAlertApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
        setMessage(
          error.statusCode === 0
            ? 'Unable to publish the alert. Please check your connection.'
            : error.message,
        );
      } else {
        if (__DEV__) {
          console.warn('Unexpected alert publishing error:', error);
        }

        setMessage('Unable to publish the alert. Please check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (submitting) {
      return;
    }

    const validation = validateForm(form);
    setMessage(null);

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      return;
    }

    confirmPublish(() => void publishAlert(validation.payload));
  };

  if (!authorized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.restrictedContent}>
          <BackButton onPress={() => router.replace('/alerts' as Href)} />
          <View style={styles.restrictedPanel}>
            <Text style={styles.restrictedEyebrow}>Restricted Module</Text>
            <Text style={styles.restrictedTitle}>Official alert publishing is protected</Text>
            <Text style={styles.restrictedText}>
              Emergency alerts can only be sent by authorized ResQ1 authority or admin accounts.
            </Text>
            <AuthButton
              title="View Emergency Alerts"
              variant="secondary"
              onPress={() => router.replace('/alerts' as Href)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <BackButton onPress={() => router.replace('/alerts' as Href)} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Authority Warning Console</Text>
            <Text style={styles.title}>Send Emergency Alert</Text>
            <Text style={styles.subtitle}>Publish a verified warning for communities at risk.</Text>
          </View>

          <View style={styles.noticeCard}>
            <View style={styles.noticeAccent} />
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Official public warning</Text>
              <Text style={styles.noticeText}>
                Publish only verified emergency information. Residents may see the alert immediately after submission.
              </Text>
            </View>
          </View>

          {message ? <StatusBanner message={message} type="error" /> : null}

          <View style={styles.form}>
            <FormSection
              helper="Use a short public headline residents can understand quickly."
              title="Alert Information">
              <AuthTextField
                autoCapitalize="sentences"
                error={fieldErrors.title}
                label="Alert Title"
                onChangeText={(value) => updateField('title', value)}
                placeholder="Critical Flood Warning - Panadura"
                value={form.title}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Disaster Type</Text>
                <View style={styles.fixedField}>
                  <Text style={styles.fixedFieldText}>Flood</Text>
                </View>
              </View>
            </FormSection>

            <FormSection helper="Match the warning to a resident area where possible." title="Affected Area">
              <AuthTextField
                autoCapitalize="words"
                error={fieldErrors.affectedArea}
                label="Affected Area"
                onChangeText={(value) => updateField('affectedArea', value)}
                placeholder="Panadura"
                value={form.affectedArea}
              />
            </FormSection>

            <FormSection helper="Critical and High warnings receive stronger visual priority." title="Risk Assessment">
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Risk Level</Text>
                <View style={[styles.riskGrid, fieldErrors.riskLevel && styles.selectorError]}>
                  {alertRiskLevels.map((riskLevel) => {
                    const selected = form.riskLevel === riskLevel;
                    const critical = riskLevel === 'Critical';

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={riskLevel}
                        onPress={() => {
                          setForm((current) => ({ ...current, riskLevel }));
                          setFieldErrors((current) => ({ ...current, riskLevel: undefined }));
                        }}
                        style={({ pressed }) => [
                          styles.riskOption,
                          selected && styles.riskOptionSelected,
                          critical && styles.criticalOption,
                          selected && critical && styles.criticalOptionSelected,
                          pressed && styles.pressed,
                        ]}>
                        <Text
                          style={[
                            styles.riskOptionText,
                            selected && styles.riskOptionTextSelected,
                          ]}>
                          {riskLevel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {fieldErrors.riskLevel ? <Text style={styles.errorText}>{fieldErrors.riskLevel}</Text> : null}
              </View>
            </FormSection>

            <FormSection
              helper="Provide a clear and concise description of the current danger."
              title="Public Warning Message">
              <AuthTextField
                autoCapitalize="sentences"
                error={fieldErrors.message}
                label="Public Warning Message"
                multiline
                numberOfLines={5}
                onChangeText={(value) => updateField('message', value)}
                placeholder="Water levels are rising rapidly in low-lying areas. Residents near the river should prepare to move to higher ground."
                style={styles.textAreaInput}
                textAlignVertical="top"
                value={form.message}
              />
            </FormSection>

            <FormSection
              helper="Provide immediate actions residents should take."
              title="Safety Instructions">
              <AuthTextField
                autoCapitalize="sentences"
                error={fieldErrors.safetyInstructions}
                label="Safety Instructions"
                multiline
                numberOfLines={5}
                onChangeText={(value) => updateField('safetyInstructions', value)}
                placeholder="Move to higher ground. Avoid flooded roads and bridges. Follow official evacuation instructions."
                style={styles.textAreaInput}
                textAlignVertical="top"
                value={form.safetyInstructions}
              />
            </FormSection>

            <FormSection
              helper="Leave blank only if an authority will manually resolve the alert."
              title="Alert Validity">
              <AuthTextField
                autoCapitalize="none"
                error={fieldErrors.expiresAt}
                label="Expiration Date/Time"
                onChangeText={(value) => updateField('expiresAt', value)}
                placeholder="2026-08-19T06:00:00"
                value={form.expiresAt}
              />
            </FormSection>
          </View>

          <View style={styles.publishPanel}>
            <Text style={styles.publishTitle}>Publish Alert</Text>
            <Text style={styles.publishCopy}>
              A confirmation will appear before this emergency alert is sent to residents.
            </Text>
            <PrePublishSummary form={form} />
            <AuthButton
              disabled={submitting}
              loading={submitting}
              style={styles.publishButton}
              title="Publish Emergency Alert"
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  restrictedContent: {
    flex: 1,
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  restrictedPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  restrictedEyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  restrictedTitle: {
    color: BrandColors.navy,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  restrictedText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  noticeAccent: {
    backgroundColor: BrandColors.red,
    width: 5,
  },
  noticeContent: {
    flex: 1,
    gap: 5,
    padding: 15,
  },
  noticeTitle: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  noticeText: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  form: {
    gap: 14,
  },
  section: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  sectionHelper: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  fixedField: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  fixedFieldText: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  riskGrid: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  },
  selectorError: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
  },
  riskOption: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: '47%',
    paddingHorizontal: 10,
  },
  riskOptionSelected: {
    backgroundColor: BrandColors.deepBlue,
    borderColor: BrandColors.deepBlue,
  },
  criticalOption: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
  },
  criticalOptionSelected: {
    backgroundColor: BrandColors.red,
  },
  riskOptionText: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  riskOptionTextSelected: {
    color: BrandColors.white,
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 13,
    lineHeight: 18,
  },
  textAreaInput: {
    minHeight: 118,
    paddingTop: 13,
  },
  publishPanel: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.deepBlue,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  publishTitle: {
    color: BrandColors.white,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  publishCopy: {
    color: BrandColors.sky,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  reviewEyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  summaryRow: {
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    gap: 5,
    paddingTop: 9,
  },
  summaryLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  publishButton: {
    backgroundColor: BrandColors.red,
  },
  pressed: {
    opacity: 0.72,
  },
});
