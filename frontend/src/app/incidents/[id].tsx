import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton } from '@/components/common/auth-components';
import {
  SeverityBadge,
  StatusBadge,
  StatusTimeline,
} from '@/components/incidents/incident-badges';
import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/shelters/native-map';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getIncidentById, isIncidentApiError, updateIncidentStatus } from '@/services/incidentService';
import { API_BASE_URL } from '@/services/authService';
import { incidentStatusWorkflow, type Incident, type IncidentStatus } from '@/types/incident';

const authorityStatusOptions = incidentStatusWorkflow.filter((status) => status !== 'Reported');

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function photoUrl(path: string) {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export default function IncidentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const incidentId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loadingIncident, setLoadingIncident] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isStatusDropdownVisible, setIsStatusDropdownVisible] = useState(false);

  const handleUpdateStatus = useCallback(async (newStatus: IncidentStatus) => {
    if (!token || !incident || !incidentId) return;

    const performUpdate = async () => {
      setUpdatingStatus(true);
      try {
        const updatedIncident = await updateIncidentStatus(Number(incidentId), newStatus, token);
        setIncident(updatedIncident);
        if (Platform.OS === 'web') {
          window.alert(`Status updated to ${newStatus}.`);
        }
      } catch (error) {
        const message = isIncidentApiError(error) ? error.message : 'Unable to update status.';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
      } finally {
        setUpdatingStatus(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to change this incident's status to ${newStatus}?`)) {
        void performUpdate();
      }
    } else {
      Alert.alert(
        'Confirm Status Update',
        `Are you sure you want to change this incident's status to ${newStatus}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: performUpdate },
        ]
      );
    }
  }, [incident, incidentId, token]);

  const loadIncident = useCallback(async (refresh = false) => {
    if (!token || !incidentId) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingIncident(true);
    }

    setErrorMessage(null);

    try {
      const report = await getIncidentById(incidentId, token);
      setIncident(report);
    } catch (error) {
      if (__DEV__ && !isIncidentApiError(error)) {
        console.warn('Unexpected incident detail error:', error);
      }

      setErrorMessage('Unable to load this incident report.');
    } finally {
      setLoadingIncident(false);
      setRefreshing(false);
    }
  }, [incidentId, token]);

  useEffect(() => {
    if (token && incidentId) {
      void loadIncident();
    } else if (!incidentId) {
      setLoadingIncident(false);
      setErrorMessage('Unable to load this incident report.');
    }
  }, [incidentId, loadIncident, token]);

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

  const incidentLatitude = incident?.latitude ?? null;
  const incidentLongitude = incident?.longitude ?? null;
  const showLocationMap = incidentLatitude !== null && incidentLongitude !== null;
  const showInitialLoading = loadingIncident && !incident;
  const showError = Boolean(errorMessage) && !incident && !showInitialLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadIncident(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.replace('/incidents' as Href)} />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Incident Details</Text>
          <Text style={styles.title}>Incident Details</Text>
          <Text style={styles.subtitle}>{incident ? `Report #${incident.id}` : 'Report details'}</Text>
        </View>

        {errorMessage && incident ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateText}>Loading incident details...</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Unable to load this incident report.</Text>
            <Text style={styles.stateText}>Check your connection and try again.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Retry"
              variant="secondary"
              onPress={() => void loadIncident()}
            />
          </View>
        ) : null}

        {incident ? (
          <>
            <View style={styles.summaryPanel}>
              <View style={styles.summaryHeader}>
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={incident.status} />
                  <SeverityBadge severity={incident.severity} />
                </View>
              </View>
            </View>

            {incident.status === 'Reported' && (
              <View style={styles.editActionContainer}>
                <AuthButton
                  title="Edit Report"
                  variant="secondary"
                  onPress={() => router.push(`/incidents/edit?id=${incident.id}` as Href)}
                />
              </View>
            )}

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Reported Location</Text>
              {showLocationMap ? (
                Platform.OS === 'web' ? (
                  <View style={styles.mapFallbackCard}>
                    <Text style={styles.mapFallbackText}>{incident.location}</Text>
                  </View>
                ) : (
                  <View style={styles.mapContainer}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.map}
                      initialRegion={{
                        latitude: incidentLatitude,
                        longitude: incidentLongitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }}>
                      <Marker
                        coordinate={{ latitude: incidentLatitude, longitude: incidentLongitude }}
                        description={incident.location}
                        pinColor={BrandColors.red}
                        title="Incident Location"
                      />
                    </MapView>
                  </View>
                )
              ) : (
                <Text style={styles.sectionCopy}>No location attached to this report.</Text>
              )}
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Incident Information</Text>
              <View style={styles.descriptionBlock}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.description}>{incident.description}</Text>
              </View>
              <DetailRow label="Location" value={incident.location} />
              <DetailRow label="Incident Type" value={incident.incidentType} />
              <DetailRow label="Severity" value={incident.severity} />
              <DetailRow label="Submitted Date" value={formatDateTime(incident.createdAt)} />
              <DetailRow label="Last Updated" value={formatDateTime(incident.updatedAt)} />
            </View>

            {incident.photos.length > 0 ? (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>Photo Evidence</Text>
                <Text style={styles.sectionCopy}>{incident.photos.length} photo{incident.photos.length === 1 ? '' : 's'} attached to this report.</Text>
                <View style={styles.photoGrid}>
                  {incident.photos.map((photo, index) => (
                    <Pressable
                      key={photo.id}
                      onPress={() => setViewingPhotoIndex(index)}
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <Image
                        accessibilityLabel={`Incident evidence photo ${index + 1}`}
                        source={{ uri: photoUrl(photo.url), headers: { Authorization: `Bearer ${token}` } }}
                        style={styles.photo}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {user?.role === 'authority' && (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>Authority Actions</Text>
                <Text style={styles.sectionCopy}>Review and update the progress of this incident.</Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.dropdownWrapper}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isStatusDropdownVisible }}
                      disabled={updatingStatus}
                      onPress={() => setIsStatusDropdownVisible((visible) => !visible)}
                      style={[styles.dropdownButton, updatingStatus && styles.refreshButtonDisabled]}>
                      <Text style={styles.dropdownButtonText}>
                        {updatingStatus ? 'Updating...' : incident.status}
                      </Text>
                      <Text style={styles.dropdownCaret}>
                        {isStatusDropdownVisible ? '▲' : '▼'}
                      </Text>
                    </Pressable>
                    {isStatusDropdownVisible && !updatingStatus ? (
                      <View style={styles.dropdownPanel}>
                        {authorityStatusOptions.map((status) => (
                          <Pressable
                            accessibilityRole="button"
                            key={status}
                            onPress={() => {
                              setIsStatusDropdownVisible(false);
                              if (status !== incident.status) {
                                void handleUpdateStatus(status);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.dropdownItem,
                              incident.status === status && styles.dropdownItemSelected,
                              pressed && styles.pressed,
                            ]}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                incident.status === status && styles.dropdownItemTextSelected,
                              ]}>
                              {status}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleBlock}>
                  <Text style={styles.sectionTitle}>Response Status Tracker</Text>
                  <Text style={styles.sectionCopy}>Refresh to check the latest status from Neon.</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={refreshing}
                  onPress={() => void loadIncident(true)}
                  style={({ pressed }) => [
                    styles.refreshButton,
                    refreshing && styles.refreshButtonDisabled,
                    pressed && !refreshing && styles.pressed,
                  ]}>
                  {refreshing ? (
                    <ActivityIndicator color={BrandColors.deepBlue} size="small" />
                  ) : (
                    <Text style={styles.refreshButtonText}>Refresh Status</Text>
                  )}
                </Pressable>
              </View>
              <StatusTimeline currentStatus={incident.status} />
            </View>
          </>
        ) : null}
      </ScrollView>

      {incident && viewingPhotoIndex !== null && incident.photos[viewingPhotoIndex] ? (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => setViewingPhotoIndex(null)}
        >
          <View style={styles.fullScreenModal}>
            <Pressable style={styles.fullScreenClose} onPress={() => setViewingPhotoIndex(null)}>
              <Text style={styles.fullScreenCloseText}>×</Text>
            </Pressable>
            <Image
              source={{ uri: photoUrl(incident.photos[viewingPhotoIndex].url), headers: { Authorization: `Bearer ${token}` } }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      ) : null}
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
  content: {
    flexGrow: 1,
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: BrandColors.deepBlue,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  summaryPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  summaryHeader: {
    gap: 12,
  },
  incidentTitle: {
    color: BrandColors.navy,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editActionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  panelHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  panelTitleBlock: {
    flex: 1,
    gap: 3,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  sectionCopy: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 118,
    paddingHorizontal: 10,
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  refreshButtonText: {
    color: BrandColors.deepBlue,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '400',
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  dropdownButtonText: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownCaret: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownWrapper: {
    position: 'relative',
  },
  dropdownPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    left: 0,
    marginTop: 6,
    overflow: 'hidden',
    padding: 4,
    position: 'absolute',
    right: 0,
    top: '100%',
    zIndex: 20,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(8, 29, 56, 0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
    }),
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownItemSelected: {
    backgroundColor: BrandColors.lightBlue,
  },
  dropdownItemText: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: BrandColors.deepBlue,
    fontWeight: '700',
  },
  mapContainer: {
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 220,
    overflow: 'hidden',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  mapFallbackCard: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  mapFallbackText: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  descriptionBlock: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 8,
    gap: 5,
    padding: 12,
  },
  description: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  detailRow: {
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 12,
  },
  detailLabel: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 260,
    padding: 22,
  },
  emptyTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '700',
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
  inlineError: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineErrorText: {
    color: BrandColors.red,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photo: {
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 120,
    width: 120,
  },
  pressed: {
    opacity: 0.72,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  fullScreenCloseText: {
    color: '#fff',
    fontSize: 40,
    lineHeight: 40,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});
