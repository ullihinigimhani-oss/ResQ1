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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton } from '@/components/common/auth-components';
import {
  SeverityBadge,
  StatusBadge,
  StatusTimeline,
} from '@/components/incidents/incident-badges';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getIncidentById, isIncidentApiError } from '@/services/incidentService';
import { API_BASE_URL } from '@/services/authService';
import type { Incident } from '@/types/incident';

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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function coordinatesText(incident: Incident) {
  if (incident.latitude === null || incident.longitude === null) {
    return null;
  }

  return `${incident.latitude}, ${incident.longitude}`;
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

  const coordinates = incident ? coordinatesText(incident) : null;
  const showInitialLoading = loadingIncident && !incident;
  const showError = Boolean(errorMessage) && !incident && !showInitialLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
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

              <View style={styles.summaryGrid}>
                <SummaryItem label="Incident Type" value={incident.incidentType} />
                <SummaryItem label="Location" value={incident.location} />
                <SummaryItem label="Reported" value={formatDateTime(incident.createdAt)} />
                <SummaryItem label="Last Updated" value={formatDateTime(incident.updatedAt)} />
              </View>
            </View>

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

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Incident Information</Text>
              <View style={styles.descriptionBlock}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.description}>{incident.description}</Text>
              </View>
              <DetailRow label="Location" value={incident.location} />
              {coordinates ? <DetailRow label="Coordinates" value={coordinates} /> : null}
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
                    <Image
                      accessibilityLabel={`Incident evidence photo ${index + 1}`}
                      key={photo.id}
                      source={{ uri: photoUrl(photo.url), headers: { Authorization: `Bearer ${token}` } }}
                      style={styles.photo}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
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
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    color: BrandColors.deepBlue,
    fontSize: 15,
    fontWeight: '800',
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
    fontWeight: '900',
    lineHeight: 27,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 8,
    flexGrow: 1,
    minWidth: '47%',
    padding: 12,
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
    marginTop: 4,
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
    fontWeight: '900',
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
    fontWeight: '900',
    lineHeight: 16,
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
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '800',
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
    fontWeight: '700',
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
});
