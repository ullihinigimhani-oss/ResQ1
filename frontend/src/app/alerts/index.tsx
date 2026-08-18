import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Redirect, useRouter, type Href } from 'expo-router';
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
import { AlertStatusBadge, LocationMatchBadge, RiskBadge } from '@/components/alerts/alert-badges';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getActiveAlerts, isAlertApiError } from '@/services/alertService';
import type { Alert } from '@/types/alert';

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

function previewText(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= 116) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, 113).trim()}...`;
}

function plural(value: number, singular: string, pluralValue: string) {
  return value === 1 ? singular : pluralValue;
}

function canPublishAlerts(role: string) {
  return role === 'admin' || role === 'authority';
}

function AlertCard({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  const critical = alert.riskLevel === 'Critical';

  return (
    <Pressable
      accessibilityLabel={`View alert: ${alert.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        critical && styles.criticalCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.alertIcon, critical && styles.criticalIcon]}>
          <SymbolView
            fallback={<Text style={[styles.alertIconText, critical && styles.criticalIconText]}>!</Text>}
            name="exclamationmark.triangle.fill"
            size={24}
            tintColor={critical ? BrandColors.white : BrandColors.deepBlue}
            type="monochrome"
            weight="bold"
          />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, critical && styles.criticalTitle]}>{alert.title}</Text>
          <Text style={styles.cardArea}>{alert.affectedArea}</Text>
        </View>
      </View>

      <Text style={styles.cardMessage}>{previewText(alert.message)}</Text>

      <View style={styles.badgeRow}>
        <RiskBadge riskLevel={alert.riskLevel} />
        <AlertStatusBadge status={alert.status} />
        {alert.isRelevantToResident ? <LocationMatchBadge /> : null}
      </View>

      <View style={styles.cardDetailGrid}>
        <View style={styles.detailTile}>
          <Text style={styles.detailLabel}>Disaster Type</Text>
          <Text style={styles.detailValue}>{alert.disasterType}</Text>
        </View>
        <View style={styles.detailTile}>
          <Text style={styles.detailLabel}>Published</Text>
          <Text style={styles.detailValue}>{formatDateTime(alert.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>Latest verified warning</Text>
        <View style={[styles.viewButton, critical && styles.criticalViewButton]}>
          <Text style={[styles.viewButtonText, critical && styles.criticalViewButtonText]}>View Alert</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({ count, title }: { count: number; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAlerts = useCallback(async (refresh = false) => {
    if (!token) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingAlerts(true);
    }

    setErrorMessage(null);

    try {
      const activeAlerts = await getActiveAlerts(token);
      setAlerts(activeAlerts);
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert list error:', error);
      }

      setErrorMessage('Unable to load emergency alerts.');
    } finally {
      setLoadingAlerts(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadAlerts();
    }
  }, [loadAlerts, token]);

  const nearAlerts = useMemo(
    () => alerts.filter((alert) => alert.isRelevantToResident),
    [alerts],
  );
  const otherAlerts = useMemo(
    () => alerts.filter((alert) => !alert.isRelevantToResident),
    [alerts],
  );
  const criticalAlerts = useMemo(
    () => alerts.filter((alert) => alert.riskLevel === 'Critical'),
    [alerts],
  );
  const canPublish = Boolean(user && canPublishAlerts(user.role));

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

  const showInitialLoading = loadingAlerts && alerts.length === 0;
  const showError = Boolean(errorMessage) && alerts.length === 0 && !showInitialLoading;
  const showEmpty = !showInitialLoading && !showError && alerts.length === 0;
  const areaLabel = user.location?.trim() || 'your area';
  const summaryTitle = criticalAlerts.length > 0
    ? `${criticalAlerts.length} Critical ${plural(criticalAlerts.length, 'Alert', 'Alerts')}`
    : alerts.length > 0
      ? `${alerts.length} Active ${plural(alerts.length, 'Alert', 'Alerts')}`
      : 'No active emergency alerts';
  const summaryCopy = criticalAlerts.length > 0
    ? `Critical warning active for ${criticalAlerts[0]?.affectedArea || areaLabel}. Review safety instructions immediately.`
    : alerts.length > 0
      ? `Verified warnings are being monitored for ${areaLabel}.`
      : 'No active emergency alerts';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadAlerts(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.replace('/dashboard' as Href)} />
          {canPublish ? (
            <Pressable
              accessibilityLabel="Send emergency alert"
              accessibilityRole="button"
              onPress={() => router.push('/alerts/create' as Href)}
              style={({ pressed }) => [styles.publishHeaderButton, pressed && styles.pressed]}>
              <Text style={styles.publishHeaderButtonText}>Send Alert</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.header}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>Monitoring active warnings</Text>
          </View>
          <Text style={styles.title}>Emergency Alerts</Text>
          <Text style={styles.subtitle}>
            Stay informed about active disaster warnings and safety instructions in your area.
          </Text>
        </View>

        <View style={[styles.summaryPanel, criticalAlerts.length > 0 && styles.criticalSummaryPanel]}>
          <Text style={styles.summaryEyebrow}>Emergency Status</Text>
          <Text style={[styles.summaryTitle, criticalAlerts.length > 0 && styles.criticalSummaryTitle]}>
            {summaryTitle}
          </Text>
          <Text style={styles.summaryCopy}>{summaryCopy}</Text>
          {nearAlerts.length > 0 ? (
            <Text style={styles.nearCopy}>{nearAlerts.length} matched {areaLabel}</Text>
          ) : null}
        </View>

        {errorMessage && alerts.length > 0 ? <StatusBanner message={errorMessage} type="error" /> : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateTitle}>Loading emergency alerts...</Text>
            <Text style={styles.stateText}>Checking verified disaster warnings from ResQ1.</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Unable to load emergency alerts.</Text>
            <Text style={styles.stateText}>Check your connection and try again.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Retry"
              variant="secondary"
              onPress={() => void loadAlerts()}
            />
          </View>
        ) : null}

        {showEmpty ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No active emergency alerts</Text>
            <Text style={styles.stateText}>
              There are currently no verified disaster warnings for your area.
            </Text>
            <Text style={styles.reassuranceText}>Continue to monitor official updates during severe weather.</Text>
          </View>
        ) : null}

        {!showInitialLoading && !showError && alerts.length > 0 ? (
          <View style={styles.list}>
            {nearAlerts.length > 0 ? (
              <>
                <SectionHeader count={nearAlerts.length} title="Alerts Near Me" />
                {nearAlerts.map((alert) => (
                  <AlertCard
                    alert={alert}
                    key={alert.id}
                    onPress={() => router.push({
                      pathname: '/alerts/[id]',
                      params: { id: String(alert.id) },
                    } as unknown as Href)}
                  />
                ))}
              </>
            ) : null}

            {otherAlerts.length > 0 ? (
              <>
                <SectionHeader
                  count={otherAlerts.length}
                  title="All Active Alerts"
                />
                {otherAlerts.map((alert) => (
                  <AlertCard
                    alert={alert}
                    key={alert.id}
                    onPress={() => router.push({
                      pathname: '/alerts/[id]',
                      params: { id: String(alert.id) },
                    } as unknown as Href)}
                  />
                ))}
              </>
            ) : null}
          </View>
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
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  publishHeaderButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  publishHeaderButtonText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  header: {
    gap: 9,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusDot: {
    backgroundColor: BrandColors.success,
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  statusPillText: {
    color: BrandColors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
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
  summaryPanel: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.deepBlue,
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 16,
  },
  criticalSummaryPanel: {
    borderColor: BrandColors.red,
    borderLeftColor: BrandColors.red,
    borderLeftWidth: 6,
  },
  summaryEyebrow: {
    color: BrandColors.sky,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: BrandColors.white,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  criticalSummaryTitle: {
    color: BrandColors.white,
  },
  summaryCopy: {
    color: BrandColors.sky,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  nearCopy: {
    color: BrandColors.white,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  list: {
    gap: 12,
    paddingBottom: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  sectionCount: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 16,
    shadowColor: BrandColors.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  criticalCard: {
    borderColor: BrandColors.red,
    borderLeftColor: BrandColors.red,
    borderLeftWidth: 6,
  },
  cardTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  criticalIcon: {
    backgroundColor: BrandColors.red,
    borderColor: BrandColors.red,
  },
  alertIconText: {
    color: BrandColors.deepBlue,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  criticalIconText: {
    color: BrandColors.white,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  criticalTitle: {
    color: BrandColors.red,
  },
  cardArea: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  cardMessage: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailTile: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 8,
    flexGrow: 1,
    minWidth: '47%',
    padding: 12,
  },
  detailLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 4,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  footerText: {
    color: BrandColors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  viewButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  criticalViewButton: {
    backgroundColor: BrandColors.red,
    borderColor: BrandColors.red,
  },
  viewButtonText: {
    color: BrandColors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  criticalViewButtonText: {
    color: BrandColors.white,
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 250,
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
  reassuranceText: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
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
