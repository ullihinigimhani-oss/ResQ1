import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthButton,
  AuthTextField,
  BackButton,
  StatusBanner,
} from '@/components/common/auth-components';
import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/shelters/native-map';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getShelterById, isShelterApiError, updateShelter } from '@/services/shelterService';
import type { Shelter, ShelterFieldErrors, UpdateShelterPayload } from '@/types/shelter';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type ShelterForm = {
  name: string;
  area: string;
  address: string;
  latitude: string;
  longitude: string;
  capacity: string;
  currentOccupancy: string;
  status: string;
  contactNumber: string;
  facilities: string;
};

const shelterStatuses = ['Open', 'Limited', 'Full', 'Closed'];

function canEditShelters(role: string) {
  return role === 'admin' || role === 'authority';
}

function validateForm(form: ShelterForm) {
  const errors: ShelterFieldErrors = {};
  const name = form.name.trim();
  const area = form.area.trim();
  const capacity = form.capacity.trim();
  const currentOccupancy = form.currentOccupancy.trim();

  if (name && !name) {
    errors.name = 'Shelter name cannot be empty.';
  }

  if (area && !area) {
    errors.area = 'Area cannot be empty.';
  }

  if (capacity) {
    const capacityNum = Number(capacity);
    if (Number.isNaN(capacityNum) || capacityNum < 0) {
      errors.capacity = 'Capacity must be a positive number.';
    }
  }

  if (currentOccupancy) {
    const occupancyNum = Number(currentOccupancy);
    if (Number.isNaN(occupancyNum) || occupancyNum < 0) {
      errors.currentOccupancy = 'Current occupancy must be a positive number.';
    }
  }

  if (capacity && currentOccupancy) {
    const capacityNum = Number(capacity);
    const occupancyNum = Number(currentOccupancy);
    if (occupancyNum > capacityNum) {
      errors.currentOccupancy = 'Current occupancy cannot exceed capacity.';
    }
  }

  return errors;
}

function parseFacilities(facilitiesText: string): string[] {
  if (!facilitiesText.trim()) {
    return [];
  }

  return facilitiesText
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
}

export default function EditShelterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loadingShelter, setLoadingShelter] = useState(true);
  const [form, setForm] = useState<ShelterForm>({
    name: '',
    area: '',
    address: '',
    latitude: '',
    longitude: '',
    capacity: '',
    currentOccupancy: '',
    status: '',
    contactNumber: '',
    facilities: '',
  });
  const [errors, setErrors] = useState<ShelterFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const loadShelter = useCallback(async () => {
    if (!token || !shelterId) {
      return;
    }

    setLoadingShelter(true);

    try {
      const safeShelter = await getShelterById(shelterId, token);
      setShelter(safeShelter);
      setForm({
        name: safeShelter.name,
        area: safeShelter.area,
        address: safeShelter.address || '',
        latitude: safeShelter.latitude?.toString() || '',
        longitude: safeShelter.longitude?.toString() || '',
        capacity: safeShelter.capacity?.toString() || '',
        currentOccupancy: safeShelter.currentOccupancy?.toString() || '',
        status: safeShelter.status,
        contactNumber: safeShelter.contactNumber || '',
        facilities: safeShelter.facilities.join(', '),
      });
      
      // Initialize map with existing shelter location
      if (safeShelter.latitude && safeShelter.longitude) {
        setSelectedLocation({ latitude: safeShelter.latitude, longitude: safeShelter.longitude });
        setMapRegion({
          latitude: safeShelter.latitude,
          longitude: safeShelter.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      if (__DEV__ && !isShelterApiError(error)) {
        console.warn('Unexpected shelter detail error:', error);
      }
      setSubmitError('Unable to load shelter details.');
    } finally {
      setLoadingShelter(false);
    }
  }, [shelterId, token]);

  useEffect(() => {
    if (token && shelterId) {
      void loadShelter();
    }
  }, [loadShelter, shelterId, token]);

  const handleFieldChange = (field: keyof ShelterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field in errors && errors[field as keyof ShelterFieldErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setForm((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: mapRegion.latitudeDelta,
      longitudeDelta: mapRegion.longitudeDelta,
    });
  };

  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        NativeAlert.alert('Permission Denied', 'Location permission is required to get your current position.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      setSelectedLocation({ latitude, longitude });
      setForm((prev) => ({
        ...prev,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      NativeAlert.alert('Error', 'Failed to get current location. Please try again.');
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!token || !shelterId) {
      setSubmitError('Authentication required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: UpdateShelterPayload = {};

      if (form.name !== shelter?.name) {
        payload.name = form.name.trim();
      }
      if (form.area !== shelter?.area) {
        payload.area = form.area.trim();
      }
      if (form.address !== (shelter?.address || '')) {
        payload.address = form.address.trim() || undefined;
      }
      if (form.latitude !== (shelter?.latitude?.toString() || '')) {
        payload.latitude = form.latitude ? Number(form.latitude) : undefined;
      }
      if (form.longitude !== (shelter?.longitude?.toString() || '')) {
        payload.longitude = form.longitude ? Number(form.longitude) : undefined;
      }
      if (form.capacity !== (shelter?.capacity?.toString() || '')) {
        payload.capacity = form.capacity ? Number(form.capacity) : undefined;
      }
      if (form.currentOccupancy !== (shelter?.currentOccupancy?.toString() || '')) {
        payload.currentOccupancy = form.currentOccupancy ? Number(form.currentOccupancy) : undefined;
      }
      if (form.status !== shelter?.status) {
        payload.status = form.status.trim() || undefined;
      }
      if (form.contactNumber !== (shelter?.contactNumber || '')) {
        payload.contactNumber = form.contactNumber.trim() || undefined;
      }
      if (form.facilities !== shelter?.facilities.join(', ')) {
        payload.facilities = parseFacilities(form.facilities);
      }

      if (Object.keys(payload).length === 0) {
        NativeAlert.alert('No Changes', 'No fields were modified.');
        return;
      }

      await updateShelter(shelterId, payload, token);

      NativeAlert.alert(
        'Success',
        'Safe shelter updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/shelters/${shelterId}` as Href),
          },
        ],
      );
    } catch (error) {
      if (isShelterApiError(error)) {
        if (error.fieldErrors) {
          setErrors(error.fieldErrors);
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!user || !canEditShelters(user.role)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            You are not authorized to edit safe shelters.
          </Text>
          <AuthButton
            style={styles.errorButton}
            title="Go Back"
            variant="secondary"
            onPress={() => router.replace('/shelters' as Href)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || loadingShelter) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BrandColors.red} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <BackButton onPress={() => router.replace(`/shelters/${shelterId}` as Href)} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Emergency Response</Text>
            <Text style={styles.title}>Edit Safe Shelter</Text>
            <Text style={styles.subtitle}>
              Update verified emergency shelter information.
            </Text>
          </View>

          {submitError ? (
            <StatusBanner message={submitError} type="error" />
          ) : null}

          <View style={styles.form}>
            <AuthTextField
              error={errors.name}
              label="Shelter Name"
              placeholder="Enter shelter name"
              value={form.name}
              onChangeText={(value) => handleFieldChange('name', value)}
            />

            <AuthTextField
              error={errors.area}
              label="Area"
              placeholder="Enter area (e.g., Panadura)"
              value={form.area}
              onChangeText={(value) => handleFieldChange('area', value)}
            />

            <AuthTextField
              label="Address"
              placeholder="Enter full address"
              value={form.address}
              onChangeText={(value) => handleFieldChange('address', value)}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Shelter Location</Text>
              <Text style={styles.helperText}>Tap on the map to update the shelter location or use your current location</Text>
              
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  region={mapRegion}
                  onPress={handleMapPress}>
                  {selectedLocation && (
                    <Marker
                      coordinate={selectedLocation}
                      title="Shelter Location"
                      description="Selected shelter position"
                      pinColor={BrandColors.success}
                    />
                  )}
                </MapView>
                
                <Pressable style={styles.currentLocationButton} onPress={handleGetCurrentLocation}>
                  <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <AuthTextField
                  label="Latitude"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={form.latitude}
                  editable={false}
                  style={styles.readOnlyField}
                />
              </View>
              <View style={styles.halfField}>
                <AuthTextField
                  label="Longitude"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={form.longitude}
                  editable={false}
                  style={styles.readOnlyField}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <AuthTextField
                  error={errors.capacity}
                  label="Capacity"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={form.capacity}
                  onChangeText={(value) => handleFieldChange('capacity', value)}
                />
              </View>
              <View style={styles.halfField}>
                <AuthTextField
                  error={errors.currentOccupancy}
                  label="Current Occupancy"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={form.currentOccupancy}
                  onChangeText={(value) => handleFieldChange('currentOccupancy', value)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {shelterStatuses.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => handleFieldChange('status', status)}
                    style={({ pressed }) => [
                      styles.statusChip,
                      form.status === status && styles.statusChipSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text
                      style={[
                        styles.statusText,
                        form.status === status && styles.statusTextSelected,
                      ]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <AuthTextField
              label="Contact Number"
              placeholder="Enter contact number"
              keyboardType="phone-pad"
              value={form.contactNumber}
              onChangeText={(value) => handleFieldChange('contactNumber', value)}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Facilities</Text>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Enter facilities separated by commas (e.g., Medical, Food, Water)"
                placeholderTextColor="#8B98A9"
                selectionColor={BrandColors.blue}
                style={styles.textArea}
                value={form.facilities}
                onChangeText={(value) => handleFieldChange('facilities', value)}
              />
            </View>

            <AuthButton
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={styles.submitButton}
              title={isSubmitting ? 'Updating Shelter...' : 'Update Shelter'}
              variant="primary"
            />

            {isSubmitting ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={BrandColors.white} size="large" />
              </View>
            ) : null}
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
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 18,
    paddingHorizontal: 18,
    paddingBottom: 96,
    paddingTop: 18,
  },
  header: {
    gap: 7,
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
  form: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  field: {
    gap: 6,
  },
  label: {
    color: BrandColors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  helperText: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 8,
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    height: 250,
  },
  map: {
    flex: 1,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currentLocationButtonText: {
    color: BrandColors.white,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  readOnlyField: {
    backgroundColor: BrandColors.background,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  statusChipSelected: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  statusText: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  statusTextSelected: {
    color: BrandColors.white,
  },
  textArea: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    margin: 18,
    minHeight: 240,
    padding: 22,
  },
  errorTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  errorText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 4,
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
  },
});
