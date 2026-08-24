import { StatusBar } from 'expo-status-bar';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { createIncident, isIncidentApiError, uploadIncidentPhoto } from '@/services/incidentService';
import {
  incidentSeverityOptions,
  incidentTypeOptions,
  type CreateIncidentPayload,
  type IncidentFieldErrors,
  type IncidentSeverity,
  type IncidentType,
  type SelectedIncidentPhoto,
} from '@/types/incident';

const MAX_INCIDENT_PHOTOS = 5;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);


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
  const [photos, setPhotos] = useState<SelectedIncidentPhoto[]>([]);
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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


  const takePhoto = async () => {
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();

    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to capture incident evidence.');
      return;
    }

    setCameraReady(false);
    setIsCameraVisible(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !cameraReady || capturingPhoto) {
      return;
    }

    if (photos.length >= MAX_INCIDENT_PHOTOS) {
      setMessage(`You can attach up to ${MAX_INCIDENT_PHOTOS} photos.`);
      setIsCameraVisible(false);
      return;
    }

    setCapturingPhoto(true);

    try {
      const capturedPhoto = await cameraRef.current.takePictureAsync({ quality: 0.7 });

      setPhotos((current) => [
        ...current,
        {
          uri: capturedPhoto.uri,
          fileName: `incident-evidence-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: null,
          width: capturedPhoto.width,
          height: capturedPhoto.height,
          file: null,
        },
      ]);
      setIsCameraVisible(false);
    } catch (error) {
      if (__DEV__) {
        console.warn('Camera capture failed:', error);
      }
      Alert.alert('Unable to take photo', 'Please try again.');
    } finally {
      setCapturingPhoto(false);
    }
  };

  const addPickedPhotos = (assets: ImagePicker.ImagePickerAsset[]) => {
    const remainingSlots = MAX_INCIDENT_PHOTOS - photos.length;

    if (remainingSlots <= 0) {
      setMessage(`You can attach up to ${MAX_INCIDENT_PHOTOS} photos.`);
      return;
    }

    const accepted = assets
      .filter((asset) =>
        (asset.fileSize === undefined || asset.fileSize <= MAX_PHOTO_SIZE_BYTES) &&
        (asset.mimeType === null || asset.mimeType === undefined || SUPPORTED_PHOTO_TYPES.has(asset.mimeType)),
      )
      .slice(0, remainingSlots)
      .map((asset, index) => ({
        uri: asset.uri,
        fileName: asset.fileName || `incident-evidence-${Date.now()}-${index}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        fileSize: asset.fileSize ?? null,
        width: asset.width,
        height: asset.height,
        file: asset.file ?? null,
      }));

    if (accepted.length > 0) {
      setPhotos((current) => [...current, ...accepted]);
    }

    if (accepted.length !== assets.length) {
      setMessage(`Only JPEG, PNG, or WebP photos up to 8 MB can be attached. Maximum ${MAX_INCIDENT_PHOTOS} photos.`);
    }
  };

  const choosePhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.7,
      selectionLimit: Math.max(1, MAX_INCIDENT_PHOTOS - photos.length),
    });

    if (!result.canceled) {
      addPickedPhotos(result.assets);
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos((current) => current.filter((photo) => photo.uri !== uri));
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
      const incident = await createIncident(validation.payload, token);
      let photoUploadFailed = false;

      try {
        await Promise.all(photos.map((photo) => uploadIncidentPhoto(incident.id, photo, token)));
      } catch (error) {
        photoUploadFailed = true;
        if (__DEV__) {
          console.warn('Incident photo upload failed:', error);
        }
      }

      router.replace({
        pathname: '/incidents',
        params: { submitted: '1', photoUploadFailed: photoUploadFailed ? '1' : '0' },
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

            <View style={styles.photoSection}>
              <Text style={styles.photoTitle}>Photo Evidence (Optional)</Text>
              <Text style={styles.photoText}>Attach up to 5 JPEG, PNG, or WebP photos (8 MB each). Do not put yourself in danger to take a photo.</Text>
              <View style={styles.photoActions}>
                <AuthButton title="Take Photo" variant="secondary" onPress={() => void takePhoto()} style={styles.photoActionButton} />
                <AuthButton title="Choose Photos" variant="secondary" onPress={() => void choosePhotos()} style={styles.photoActionButton} />
              </View>
              {photos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {photos.map((photo, index) => (
                    <View key={photo.uri} style={styles.photoPreview}>
                      <Image accessibilityLabel={`Incident evidence photo ${index + 1}`} source={{ uri: photo.uri }} style={styles.photoImage} />
                      <Pressable accessibilityLabel={`Remove photo ${index + 1}`} accessibilityRole="button" onPress={() => removePhoto(photo.uri)} style={styles.removePhotoButton}>
                        <Text style={styles.removePhotoText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
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

      <Modal
        animationType="slide"
        onRequestClose={() => setIsCameraVisible(false)}
        visible={isCameraVisible}>
        <View style={styles.cameraScreen}>
          <CameraView
            facing={cameraFacing}
            onCameraReady={() => setCameraReady(true)}
            ref={cameraRef}
            style={styles.cameraPreview}
          />
          <View style={styles.cameraOverlay}>
            <Pressable accessibilityRole="button" onPress={() => setIsCameraVisible(false)} style={styles.cameraControl}>
              <Text style={styles.cameraControlText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCameraFacing((current) => current === 'back' ? 'front' : 'back')}
              style={styles.cameraControl}>
              <Text style={styles.cameraControlText}>Flip</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel="Capture photo"
            accessibilityRole="button"
            disabled={!cameraReady || capturingPhoto}
            onPress={() => void capturePhoto()}
            style={[styles.captureButton, (!cameraReady || capturingPhoto) && styles.captureButtonDisabled]}>
            <View style={styles.captureButtonInner} />
          </Pressable>
        </View>
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
  photoSection: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
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
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionButton: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoPreview: {
    height: 100,
    position: 'relative',
    width: 100,
  },
  photoImage: {
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: '100%',
    width: '100%',
  },
  removePhotoButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.red,
    borderColor: BrandColors.white,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    top: -6,
    width: 24,
  },
  removePhotoText: {
    color: BrandColors.white,
    fontSize: 20,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  cameraControl: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cameraControlText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
});
