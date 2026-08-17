import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
    dateStyle: 'medium',
    timeStyle: 'short',
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

function coordinatesText(incident: Incident) {
  if (incident.latitude === null || incident.longitude === null) {
    return null;
  }

  return `${incident.latitude}, ${incident.longitude}`;
}

export default function IncidentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const incidentId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loadingIncident, setLoadingIncident] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadIncident = useCallback(async () => {
    if (!token || !incidentId) {
      return;
    }

    setLoadingIncident(true);
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.replace('/incidents' as Href)} />

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateText}>Loading incident details...</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Unable to load this incident report.</Text>
            <Text style={styles.stateText}>The report may be unavailable or your session may need to be refreshed.</Text>
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
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Incident Details</Text>
              <Text style={styles.title}>{incident.title}</Text>
              <Text style={styles.subtitle}>{incident.location}</Text>
            </View>

            <View style={styles.summaryPanel}>
              <View style={styles.badgeRow}>
                <StatusBadge status={incident.status} />
                <SeverityBadge severity={incident.severity} />
              </View>
              <Text style={styles.description}>{incident.description}</Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Report Information</Text>
              <DetailRow label="Incident type" value={incident.incidentType} />
              <DetailRow label="Location" value={incident.location} />
              <DetailRow label="Reported" value={formatDateTime(incident.createdAt)} />
              <DetailRow label="Last updated" value={formatDateTime(incident.updatedAt)} />
              {coordinates ? <DetailRow label="Coordinates" value={coordinates} /> : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Status Progress</Text>
              <StatusTimeline currentStatus={incident.status} />
            </View>
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
    gap: 20,
    paddingHorizontal: 22,
    paddingVertical: 18,
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
    color: BrandColors.deepBlue,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  summaryPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    shadowColor: BrandColors.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  description: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
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
});
