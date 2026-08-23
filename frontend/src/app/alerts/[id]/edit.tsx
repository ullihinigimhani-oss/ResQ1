import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertStatusBadge, RiskBadge } from '@/components/alerts/alert-badges';
import {
  AudienceSelector,
  SchoolTargetingSection,
  audienceLabel,
} from '@/components/alerts/alert-audience-controls';
import {
  AuthButton,
  AuthTextField,
  BackButton,
  StatusBanner,
} from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getAlertById, isAlertApiError, updateAlert } from '@/services/alertService';
import {
  alertRiskLevels,
  alertStatuses,
  type Alert,
  type AlertAudience,
  type AlertFieldErrors,
  type AlertRiskLevel,
  type AlertStatus,
  type SchoolSelectionPayload,
  type UpdateAlertPayload,
} from '@/types/alert';
import { formatDateTime, isAuthorityRole } from '@/utils/format';

type AlertForm = {
  title: string;
  affectedArea: string;
  alertAudience: AlertAudience;
  riskLevel: AlertRiskLevel | '';
  status: AlertStatus | '';
  message: string;
  safetyInstructions: string;
  expiresAt: string;
  selectedSchools: SchoolSelectionPayload[];
};

type TextAlertFormField =
  | 'affectedArea'
  | 'expiresAt'
  | 'message'
  | 'riskLevel'
  | 'safetyInstructions'
  | 'status'
  | 'title';

type BannerState = {
  message: string;
  type: 'error' | 'success';
};

const initialForm: AlertForm = {
  title: '',
  affectedArea: '',
  alertAudience: 'GENERAL_PUBLIC',
  riskLevel: '',
  status: '',
  message: '',
  safetyInstructions: '',
  expiresAt: '',
  selectedSchools: [],
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formFromAlert(alert: Alert): AlertForm {
  return {
    title: alert.title,
    affectedArea: alert.affectedArea,
    alertAudience: alert.alertAudience,
    riskLevel: alert.riskLevel,
    status: alert.status,
    message: alert.message,
    safetyInstructions: alert.safetyInstructions,
    expiresAt: alert.expiresAt ?? '',
    selectedSchools: alert.schools.map((school) => ({
      id: school.id,
      schoolName: school.schoolName,
      area: school.area,
      latitude: school.latitude,
      longitude: school.longitude,
      osmId: school.osmId,
      osmType: school.osmType,
      formattedAddress: school.formattedAddress,
    })),
  };
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

  return formatDateTime(date.toISOString());
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

  if (form.alertAudience === 'SCHOOL_EMERGENCY' && form.selectedSchools.length === 0) {
    errors.schoolIds = 'Select at least one school for a school emergency alert.';
  }

  if (!form.status) {
    errors.status = 'Please select an alert status.';
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

  const payload: UpdateAlertPayload = {
    title,
    disasterType: 'Flood',
    affectedArea,
    alertAudience: form.alertAudience,
    riskLevel: form.riskLevel as AlertRiskLevel,
    status: form.status as AlertStatus,
    message,
    safetyInstructions,
    expiresAt,
    schoolIds: form.alertAudience === 'SCHOOL_EMERGENCY'
      ? form.selectedSchools.map((school) => school.id).filter((id): id is number => Boolean(id))
      : [],
    schools: form.alertAudience === 'SCHOOL_EMERGENCY' ? form.selectedSchools : [],
  };

  return {
    errors,
    payload,
  };
}

function confirmSave(onConfirm: () => void) {
  const message = 'This will update the published emergency warning residents may see.';

  if (Platform.OS === 'web') {
    const webConfirm = (globalThis as typeof globalThis & { confirm?: (message: string) => boolean }).confirm;

    if (typeof webConfirm === 'function') {
      if (webConfirm(`Save changes to this emergency alert?\n\n${message}`)) {
        onConfirm();
      }

      return;
    }
  }

  NativeAlert.alert('Save changes to this emergency alert?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Save Changes', onPress: onConfirm },
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

function EditSummary({ alert, form }: { alert: Alert; form: AlertForm }) {
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewEyebrow}>Selected Alert #{alert.id}</Text>
      <SummaryRow label="Title" value={form.title.trim() || 'Not entered'} />
      <SummaryRow label="Affected Area" value={form.affectedArea.trim() || 'Not entered'} />
      <SummaryRow label="Alert Audience" value={audienceLabel(form.alertAudience)} />
      {form.alertAudience === 'SCHOOL_EMERGENCY' ? (
        <SummaryRow label="Selected Schools" value={`${form.selectedSchools.length} selected`} />
      ) : null}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Risk Level</Text>
        {form.riskLevel ? (
          <RiskBadge riskLevel={form.riskLevel} />
        ) : (
          <Text style={styles.summaryValue}>Not selected</Text>
        )}
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Status</Text>
        {form.status ? (
          <AlertStatusBadge status={form.status} />
        ) : (
          <Text style={styles.summaryValue}>Not selected</Text>
        )}
      </View>
      <SummaryRow label="Message Preview" value={previewText(form.message)} />
      <SummaryRow label="Expiration" value={formatExpiration(form.expiresAt)} />
    </View>
  );
}

export default function EditAlertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alertId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [form, setForm] = useState<AlertForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<AlertFieldErrors>({});
  const [loadingAlert, setLoadingAlert] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const loadAlert = useCallback(async (refresh = false) => {
    if (!token || !alertId) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingAlert(true);
    }

    setBanner(null);

    try {
      const alertDetails = await getAlertById(alertId, token);
      setAlert(alertDetails);
      setForm(formFromAlert(alertDetails));
      setFieldErrors({});
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert edit load error:', error);
      }

      setBanner({
        message: 'Unable to load this emergency alert. Check your connection and try again.',
        type: 'error',
      });
    } finally {
      setLoadingAlert(false);
      setRefreshing(false);
    }
  }, [alertId, token]);

  useEffect(() => {
    if (token && alertId) {
      void loadAlert();
    } else if (!alertId) {
      setLoadingAlert(false);
      setBanner({
        message: 'Unable to load this emergency alert. Check your connection and try again.',
        type: 'error',
      });
    } else if (!isLoading && !token) {
      setLoadingAlert(false);
      setBanner({
        message: 'Unable to load this emergency alert. Please log in and try again.',
        type: 'error',
      });
    }
  }, [alertId, isLoading, loadAlert, token]);

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

  if (!isAuthorityRole(user.role)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.restrictedContent}>
          <BackButton onPress={() => router.replace('/alerts' as Href)} />
          <View style={styles.restrictedPanel}>
            <Text style={styles.restrictedEyebrow}>Restricted Module</Text>
            <Text style={styles.restrictedTitle}>Alert editing is protected</Text>
            <Text style={styles.restrictedText}>
              Published emergency alerts can only be edited by authorized ResQ1 authority accounts.
            </Text>
            <AuthButton
              title="Back to Alerts"
              variant="secondary"
              onPress={() => router.replace('/alerts' as Href)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const updateField = (field: TextAlertFormField, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'affectedArea' ? { selectedSchools: [] } : {}),
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === 'affectedArea' ? { schoolIds: undefined } : {}),
    }));

    if (banner?.type === 'success') {
      setBanner(null);
    }
  };

  const updateAudience = (alertAudience: AlertAudience) => {
    setForm((current) => ({
      ...current,
      alertAudience,
      selectedSchools: alertAudience === 'SCHOOL_EMERGENCY' ? current.selectedSchools : [],
    }));
    setFieldErrors((current) => ({ ...current, alertAudience: undefined, schoolIds: undefined }));

    if (banner?.type === 'success') {
      setBanner(null);
    }
  };

  const updateSelectedSchools = (selectedSchools: SchoolSelectionPayload[]) => {
    setForm((current) => ({ ...current, selectedSchools }));
    setFieldErrors((current) => ({ ...current, schoolIds: undefined }));

    if (banner?.type === 'success') {
      setBanner(null);
    }
  };

  const saveAlert = async (payload: UpdateAlertPayload) => {
    if (!token || !alertId) {
      setBanner({
        message: 'Unable to update this emergency alert. Please log in and try again.',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);

    try {
      const updatedAlert = await updateAlert(alertId, payload, token);
      setAlert(updatedAlert);
      setForm(formFromAlert(updatedAlert));
      setFieldErrors({});
      setBanner({
        message: 'Emergency alert updated successfully.',
        type: 'success',
      });
      router.replace('/alerts' as Href);
    } catch (error) {
      if (isAlertApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
        setBanner({
          message:
            error.statusCode === 0
              ? 'Unable to update this emergency alert. Check your connection and try again.'
              : error.message,
          type: 'error',
        });
      } else {
        if (__DEV__) {
          console.warn('Unexpected alert update error:', error);
        }

        setBanner({
          message: 'Unable to update this emergency alert. Check your connection and try again.',
          type: 'error',
        });
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
    setBanner(null);

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      return;
    }

    confirmSave(() => void saveAlert(validation.payload));
  };

  const showInitialLoading = loadingAlert && !alert;
  const showError = Boolean(banner?.type === 'error') && !alert && !showInitialLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={BrandColors.red}
              onRefresh={() => void loadAlert(true)}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <BackButton onPress={() => router.replace('/alerts' as Href)} />
            <Text style={styles.topBarTitle}>Edit Alert</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Authority Alert Management</Text>
            <Text style={styles.title}>Edit Emergency Alert</Text>
            <Text style={styles.subtitle}>Update the official warning details residents see.</Text>
          </View>

          {banner && !showError ? <StatusBanner message={banner.message} type={banner.type} /> : null}

          {showInitialLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={BrandColors.red} size="large" />
              <Text style={styles.stateTitle}>Loading alert details...</Text>
              <Text style={styles.stateText}>Retrieving the selected published warning.</Text>
            </View>
          ) : null}

          {showError ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>Unable to load this emergency alert.</Text>
              <Text style={styles.stateText}>Check your connection and try again.</Text>
              <AuthButton
                style={styles.stateButton}
                title="Retry"
                variant="secondary"
                onPress={() => void loadAlert()}
              />
            </View>
          ) : null}

          {alert ? (
            <>
              <View style={styles.identityPanel}>
                <View style={styles.badgeRow}>
                  <RiskBadge riskLevel={alert.riskLevel} />
                  <AlertStatusBadge status={alert.status} />
                </View>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMeta}>Alert #{alert.id} - Published {formatDateTime(alert.createdAt)}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>

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

                <FormSection helper="Choose who should receive this emergency alert." title="Alert Audience">
                  <AudienceSelector
                    error={fieldErrors.alertAudience}
                    onChange={updateAudience}
                    value={form.alertAudience}
                  />
                  {form.alertAudience === 'SCHOOL_EMERGENCY' ? (
                    <SchoolTargetingSection
                      affectedArea={form.affectedArea}
                      error={fieldErrors.schoolIds}
                      onSelectedSchoolsChange={updateSelectedSchools}
                      selectedSchools={form.selectedSchools}
                      token={token}
                    />
                  ) : null}
                </FormSection>

                <FormSection helper="Risk text remains visible to residents and authorities." title="Risk Level">
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Risk Level</Text>
                    <View style={[styles.optionGrid, fieldErrors.riskLevel && styles.selectorError]}>
                      {alertRiskLevels.map((riskLevel) => {
                        const selected = form.riskLevel === riskLevel;
                        const critical = riskLevel === 'Critical';

                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            key={riskLevel}
                            onPress={() => updateField('riskLevel', riskLevel)}
                            style={({ pressed }) => [
                              styles.optionButton,
                              selected && styles.optionButtonSelected,
                              critical && styles.criticalOption,
                              selected && critical && styles.criticalOptionSelected,
                              pressed && styles.pressed,
                            ]}>
                            <Text
                              style={[
                                styles.optionButtonText,
                                selected && styles.optionButtonTextSelected,
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

                <FormSection helper="Use Resolved only when this warning should leave the active alert list." title="Alert Status">
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Status</Text>
                    <View style={[styles.optionGrid, fieldErrors.status && styles.selectorError]}>
                      {alertStatuses.map((status) => {
                        const selected = form.status === status;

                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            key={status}
                            onPress={() => updateField('status', status)}
                            style={({ pressed }) => [
                              styles.optionButton,
                              selected && styles.optionButtonSelected,
                              pressed && styles.pressed,
                            ]}>
                            <Text
                              style={[
                                styles.optionButtonText,
                                selected && styles.optionButtonTextSelected,
                              ]}>
                              {status}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {fieldErrors.status ? <Text style={styles.errorText}>{fieldErrors.status}</Text> : null}
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
                    placeholder="Water levels are rising rapidly in low-lying areas."
                    style={styles.textAreaInput}
                    textAlignVertical="top"
                    value={form.message}
                  />
                </FormSection>

                <FormSection helper="Provide immediate actions residents should take." title="Safety Instructions">
                  <AuthTextField
                    autoCapitalize="sentences"
                    error={fieldErrors.safetyInstructions}
                    label="Safety Instructions"
                    multiline
                    numberOfLines={5}
                    onChangeText={(value) => updateField('safetyInstructions', value)}
                    placeholder="Move to higher ground. Avoid flooded roads and bridges."
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
                    placeholder="2026-08-22T06:00:00"
                    value={form.expiresAt}
                  />
                </FormSection>
              </View>

              <View style={styles.savePanel}>
                <Text style={styles.saveTitle}>Save Alert Changes</Text>
                <Text style={styles.saveCopy}>
                  Saved changes update the published emergency alert immediately.
                </Text>
                <EditSummary alert={alert} form={form} />
                <AuthButton
                  disabled={submitting}
                  loading={submitting}
                  style={styles.saveButton}
                  title="Save Changes"
                  onPress={handleSubmit}
                />
                <AuthButton
                  disabled={submitting}
                  title="View Alert"
                  variant="secondary"
                  onPress={() => router.push({
                    pathname: '/alerts/[id]',
                    params: { id: String(alert.id) },
                  } as unknown as Href)}
                />
              </View>
            </>
          ) : null}
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
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  topBarTitle: {
    color: BrandColors.navy,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  identityPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertTitle: {
    color: BrandColors.navy,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  alertMeta: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  alertMessage: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
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
  optionGrid: {
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
  optionButton: {
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
  optionButtonSelected: {
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
  optionButtonText: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  optionButtonTextSelected: {
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
  savePanel: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.deepBlue,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  saveTitle: {
    color: BrandColors.white,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  saveCopy: {
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
  saveButton: {
    backgroundColor: BrandColors.red,
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: 240,
    padding: 22,
  },
  stateTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  stateText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 4,
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
  },
});
