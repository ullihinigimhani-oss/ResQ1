import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { AppIcon, BottomNavigation } from '@/components/ui/app-components';
import { SeverityBadge, StatusBadge } from '@/components/incidents/incident-badges';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getMyIncidents, isIncidentApiError } from '@/services/incidentService';
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

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cardDetailItem}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function ReportAction({
  body,
  fallback,
  icon,
  onPress,
  title,
  tone = 'blue',
}: {
  body: string;
  fallback: string;
  icon: string;
  onPress: () => void;
  title: string;
  tone?: 'blue' | 'red';
}) {
  const tintColor = tone === 'red' ? BrandColors.red : BrandColors.deepBlue;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.reportAction,
        tone === 'red' && styles.reportActionPrimary,
        pressed && styles.pressed,
      ]}>
      <View style={styles.reportActionIcon}>
        <AppIcon fallback={fallback} name={icon} size={22} tintColor={tintColor} />
      </View>
      <View style={styles.reportActionText}>
        <Text style={styles.reportActionTitle}>{title}</Text>
        <Text style={styles.reportActionBody}>{body}</Text>
      </View>
      <Text style={styles.reportActionArrow}>{'>'}</Text>
    </Pressable>
  );
}

function IncidentCard({ incident, onPress }: { incident: Incident; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTitleBlock}>
        <Text style={styles.cardTitle}>{incident.title}</Text>
        <Text style={styles.cardMeta}>Report #{incident.id}</Text>
      </View>

      <View style={styles.cardDetailsGrid}>
        <CardDetail label="Incident Type" value={incident.incidentType} />
        <CardDetail label="Location" value={incident.location} />
      </View>

      <View style={styles.badgeSection}>
        <View style={styles.badgeGroup}>
          <Text style={styles.badgeLabel}>Severity</Text>
          <SeverityBadge severity={incident.severity} />
        </View>
        <View style={styles.badgeGroup}>
          <Text style={styles.badgeLabel}>Status</Text>
          <StatusBadge status={incident.status} />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardLabel}>Reported</Text>
          <Text style={styles.submittedText}>{formatDateTime(incident.createdAt)}</Text>
        </View>
        <Text style={styles.cardArrow}>{'>'}</Text>
      </View>
    </Pressable>
  );
}

export default function MyIncidentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoading, token, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitted = firstParam(params.submitted) === '1';
  const successMessage = useMemo(
    () => submitted ? 'Incident report submitted successfully.' : null,
    [submitted],
  );

  const loadIncidents = useCallback(async (refresh = false) => {
    if (!token) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingIncidents(true);
    }

    setErrorMessage(null);

    try {
      const reports = await getMyIncidents(token);
      setIncidents(reports);
    } catch (error) {
      if (__DEV__ && !isIncidentApiError(error)) {
        console.warn('Unexpected incident list error:', error);
      }

      setErrorMessage('Unable to load your incident reports.');
    } finally {
      setLoadingIncidents(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadIncidents();
    }
  }, [loadIncidents, token]);

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

  const showInitialLoading = loadingIncidents && incidents.length === 0;
  const showError = Boolean(errorMessage) && incidents.length === 0 && !showInitialLoading;
  const showEmpty = !showInitialLoading && !showError && incidents.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadIncidents(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.replace('/dashboard' as Href)} />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Resident Response Tracking</Text>
          <Text style={styles.title}>Report Center</Text>
          <Text style={styles.subtitle}>Submit a new incident or track the response status of your existing reports.</Text>
        </View>

        <View style={styles.reportActions}>
          <ReportAction
            body="Share a verified flood report with response teams."
            fallback="!"
            icon="exclamationmark.triangle.fill"
            title="Report New Incident"
            tone="red"
            onPress={() => router.push('/incidents/report' as Href)}
          />
          <ReportAction
            body="Review your submitted reports and response progress."
            fallback="M"
            icon="clock.fill"
            title="My Incident Reports"
            onPress={() => router.push('/incidents' as Href)}
          />
          <ReportAction
            body="Check recent reports around your area."
            fallback="N"
            icon="magnifyingglass"
            title="Nearby Incidents"
            onPress={() => router.push('/incidents/nearby' as Href)}
          />
        </View>

        {successMessage ? <StatusBanner message={successMessage} type="success" /> : null}
        {errorMessage && incidents.length > 0 ? <StatusBanner message={errorMessage} type="error" /> : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateText}>Loading incident reports...</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Unable to load your incident reports.</Text>
            <Text style={styles.stateText}>Please check your connection and try again.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Retry"
              variant="secondary"
              onPress={() => void loadIncidents()}
            />
          </View>
        ) : null}

        {showEmpty ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No incident reports yet</Text>
            <Text style={styles.stateText}>When you report a flood incident, you can track its response status here.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Report an Incident"
              onPress={() => router.push('/incidents/report' as Href)}
            />
          </View>
        ) : null}

        {incidents.length > 0 ? (
          <View style={styles.list}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>My Incident Reports</Text>
              <Text style={styles.listMeta}>{incidents.length} submitted report{incidents.length === 1 ? '' : 's'}</Text>
            </View>
            {incidents.map((incident) => (
              <IncidentCard
                incident={incident}
                key={incident.id}
                onPress={() => router.push({
                  pathname: '/incidents/[id]',
                  params: { id: String(incident.id) },
                } as unknown as Href)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation />
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
  reportActions: {
    gap: 10,
  },
  reportAction: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 13,
  },
  reportActionPrimary: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
  },
  reportActionIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  reportActionText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  reportActionTitle: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  reportActionBody: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  reportActionArrow: {
    color: BrandColors.deepBlue,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  list: {
    gap: 14,
    paddingBottom: 10,
  },
  listHeader: {
    gap: 2,
  },
  listTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  listMeta: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  cardTitleBlock: {
    gap: 4,
  },
  cardTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  cardMeta: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  cardDetailsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  cardDetailItem: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 8,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  cardLabel: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  badgeSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeGroup: {
    gap: 6,
    minWidth: '45%',
  },
  badgeLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  submittedText: {
    color: BrandColors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 3,
  },
  cardArrow: {
    color: BrandColors.deepBlue,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
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
    minHeight: 230,
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
  pressed: {
    opacity: 0.72,
  },
});
