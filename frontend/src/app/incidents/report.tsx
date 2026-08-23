import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { BottomNavigation } from '@/components/ui/app-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { createIncident, isIncidentApiError } from '@/services/incidentService';
import {
  incidentSeverityOptions,
  incidentTypeOptions,
  type CreateIncidentPayload,
  type IncidentFieldErrors,
  type IncidentSeverity,
  type IncidentType,
} from '@/types/incident';

type IncidentForm = {
  incidentType: IncidentType | '';
  title: string;
  description: string;
  location: string;
  severity: IncidentSeverity | '';
  latitudeText: string;
  longitudeText: string;
};

const initialForm: IncidentForm = {
  incidentType: '',
  title: '',
  description: '',
  location: '',
  severity: '',
  latitudeText: '',
  longitudeText: '',
};

function parseCoordinate(
  value: string,
  field: 'latitudeText' | 'longitudeText',
  errors: IncidentFieldErrors,
) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const coordinate = Number(trimmedValue);

  if (!Number.isFinite(coordinate)) {
    errors[field] = field === 'latitudeText'
      ? 'Latitude must be a valid number.'
      : 'Longitude must be a valid number.';
    return null;
  }

  if (field === 'latitudeText' && (coordinate < -90 || coordinate > 90)) {
    errors.latitudeText = 'Latitude must be between -90 and 90.';
  }

  if (field === 'longitudeText' && (coordinate < -180 || coordinate > 180)) {
    errors.longitudeText = 'Longitude must be between -180 and 180.';
  }

  return coordinate;
}

function validateForm(form: IncidentForm) {
  const errors: IncidentFieldErrors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const location = form.location.trim();

  if (!title) {
    errors.title = 'Please enter an incident title.';
  }

  if (!location) {
    errors.location = 'Please provide the affected location.';
  }

  if (!form.severity) {
    errors.severity = 'Please select the severity level.';
  }

  if (!form.incidentType) {
    errors.incidentType = 'Please select the disaster type.';
  }

  const latitude = parseCoordinate(form.latitudeText, 'latitudeText', errors);
  const longitude = parseCoordinate(form.longitudeText, 'longitudeText', errors);

  const payload: CreateIncidentPayload = {
    incidentType: form.incidentType as IncidentType,
    title,
    description,
    location,
    latitude,
    longitude,
    severity: form.severity as IncidentSeverity,
    photoUrl: null,
  };

  return {
    errors,
    payload,
  };
}

export default function ReportIncidentScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [form, setForm] = useState<IncidentForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<IncidentFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);

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

  const updateField = (field: keyof IncidentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const validation = validateForm(form);
    setMessage(null);

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      return;
    }

    if (!token) {
      setMessage('Please log in to submit an incident report.');
      return;
    }

    setSubmitting(true);

    try {
      await createIncident(validation.payload, token);
      router.replace({
        pathname: '/incidents',
        params: { submitted: '1' },
      } as unknown as Href);
    } catch (error) {
      if (isIncidentApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
        setMessage(
          error.statusCode === 0
            ? 'Unable to submit the report. Please check your connection.'
            : error.message,
        );
      } else {
        if (__DEV__) {
          console.warn('Unexpected incident submission error:', error);
        }

        setMessage('Unable to submit the report. Please check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          <BackButton onPress={() => router.replace('/incidents' as Href)} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Resident Incident Report</Text>
            <Text style={styles.title}>Report Disaster Incident</Text>
            <Text style={styles.subtitle}>
              Share accurate information to help emergency teams respond quickly.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoAccent} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Emergency reporting guidance</Text>
              <Text style={styles.infoText}>Submit only genuine incidents.</Text>
              <Text style={styles.infoText}>Provide the most accurate location possible.</Text>
              <Text style={styles.infoText}>Do not put yourself in danger to capture information.</Text>
            </View>
          </View>

          {message ? <StatusBanner message={message} type="error" /> : null}

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Disaster Type</Text>
              <Pressable
                style={[styles.dropdownButton, fieldErrors.incidentType && styles.selectorError]}
                onPress={() => setIsTypeDropdownVisible(true)}>
                <Text style={[styles.dropdownButtonText, !form.incidentType && styles.dropdownPlaceholder]}>
                  {form.incidentType || 'Select disaster type...'}
                </Text>
              </Pressable>
              {fieldErrors.incidentType ? <Text style={styles.errorText}>{fieldErrors.incidentType}</Text> : null}
            </View>

            <AuthTextField
              autoCapitalize="sentences"
              error={fieldErrors.title}
              label="Incident Title"
              onChangeText={(value) => updateField('title', value)}
              placeholder="Flooding near Panadura main road"
              value={form.title}
            />

            <AuthTextField
              autoCapitalize="sentences"
              error={fieldErrors.description}
              label="Description"
              multiline
              numberOfLines={5}
              onChangeText={(value) => updateField('description', value)}
              placeholder="Describe the water level, road condition, affected houses, blocked routes, or any immediate danger."
              style={styles.textAreaInput}
              textAlignVertical="top"
              value={form.description}
            />

            <AuthTextField
              autoCapitalize="words"
              error={fieldErrors.location}
              label="Location / Area"
              onChangeText={(value) => updateField('location', value)}
              placeholder="Panadura"
              value={form.location}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Severity</Text>
              <View style={[styles.severityGrid, fieldErrors.severity && styles.selectorError]}>
                {incidentSeverityOptions.map((severity) => {
                  const selected = form.severity === severity;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={severity}
                      onPress={() => {
                        setForm((current) => ({ ...current, severity }));
                        setFieldErrors((current) => ({ ...current, severity: undefined }));
                      }}
                      style={({ pressed }) => [
                        styles.severityOption,
                        selected && styles.severityOptionSelected,
                        severity === 'Critical' && styles.criticalOption,
                        selected && severity === 'Critical' && styles.criticalOptionSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text
                        style={[
                          styles.severityText,
                          selected && styles.severityTextSelected,
                          selected && severity === 'Critical' && styles.criticalTextSelected,
                        ]}>
                        {severity}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.severity ? <Text style={styles.errorText}>{fieldErrors.severity}</Text> : null}
            </View>


            <View style={styles.coordinateGrid}>
              <View style={styles.coordinateField}>
                <AuthTextField
                  error={fieldErrors.latitudeText}
                  keyboardType="decimal-pad"
                  label="Latitude (Optional)"
                  onChangeText={(value) => updateField('latitudeText', value)}
                  placeholder="6.713"
                  value={form.latitudeText}
                />
              </View>
              <View style={styles.coordinateField}>
                <AuthTextField
                  error={fieldErrors.longitudeText}
                  keyboardType="decimal-pad"
                  label="Longitude (Optional)"
                  onChangeText={(value) => updateField('longitudeText', value)}
                  placeholder="79.907"
                  value={form.longitudeText}
                />
              </View>
            </View>

            <View style={styles.photoPlaceholder}>
              <View>
                <Text style={styles.photoTitle}>Photo</Text>
                <Text style={styles.photoText}>Optional evidence will be supported when secure media storage is connected.</Text>
              </View>
              <Text style={styles.photoBadge}>Not attached</Text>
            </View>
            <AuthButton
              title="Add Photo Evidence"
              variant="secondary"
              onPress={() => router.push('/incidents/photo-evidence' as Href)}
            />
          </View>

          <AuthButton
            disabled={submitting}
            loading={submitting}
            title="Submit Incident Report"
            onPress={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Modal visible={isTypeDropdownVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setIsTypeDropdownVisible(false)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownTitle}>Select Disaster Type</Text>
            {incidentTypeOptions.map((type) => (
              <Pressable
                key={type}
                style={styles.dropdownItem}
                onPress={() => {
                  setForm((current) => ({ ...current, incidentType: type }));
                  setFieldErrors((current) => ({ ...current, incidentType: undefined }));
                  setIsTypeDropdownVisible(false);
                }}>
                <Text style={[styles.dropdownItemText, form.incidentType === type && styles.dropdownItemTextSelected]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <BottomNavigation />
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
    gap: 20,
    paddingHorizontal: 22,
    paddingBottom: 96,
    paddingTop: 18,
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
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
  infoCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  infoAccent: {
    backgroundColor: BrandColors.red,
    width: 5,
  },
  infoContent: {
    flex: 1,
    gap: 7,
    padding: 16,
  },
  infoTitle: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  infoText: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  textAreaInput: {
    minHeight: 118,
    paddingTop: 13,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  severityGrid: {
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
  severityOption: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 44,
    minWidth: '47%',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  severityOptionSelected: {
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
  severityText: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  severityTextSelected: {
    color: BrandColors.white,
  },
  criticalTextSelected: {
    color: BrandColors.white,
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 13,
    lineHeight: 18,
  },
  dropdownButton: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dropdownButtonText: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: BrandColors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  dropdownMenu: {
    backgroundColor: BrandColors.white,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
    marginBottom: 8,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownItemText: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: BrandColors.deepBlue,
    fontWeight: '900',
  },
  coordinateGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateField: {
    flex: 1,
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 16,
  },
  photoTitle: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  photoText: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 3,
    maxWidth: 225,
  },
  photoBadge: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.72,
  },
});
