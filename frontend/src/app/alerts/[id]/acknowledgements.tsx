import { StatusBar } from 'expo-status-bar';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { AuthButton, StatusBanner } from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import {
  getAlertAcknowledgementReport,
  getAlertById,
  isAlertApiError,
} from '@/services/alertService';
import type {
  Alert,
  AlertAcknowledgementReport,
  AlertAcknowledgementResident,
} from '@/types/alert';
import { formatDateTime, isAuthorityRole } from '@/utils/format';

type ResidentTab = 'acknowledged' | 'pending';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function metricText(value: number | null | undefined) {
  return value === null || value === undefined ? 'Not available' : String(value);
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ResidentRow({
  resident,
  tab,
}: {
  resident: AlertAcknowledgementResident;
  tab: ResidentTab;
}) {
  return (
    <View style={styles.residentRow}>
      <View style={styles.residentIdentity}>
        <Text numberOfLines={1} style={styles.residentName}>{resident.fullName}</Text>
        <Text numberOfLines={1} style={styles.residentMeta}>
          {resident.location?.trim() || 'Location not available'}
        </Text>
      </View>
      <View style={[styles.statusBadge, tab === 'acknowledged' ? styles.acknowledgedBadge : styles.pendingBadge]}>
        <Text
          style={[
            styles.statusBadgeText,
            tab === 'acknowledged' ? styles.acknowledgedBadgeText : styles.pendingBadgeText,
          ]}>
          {tab === 'acknowledged' ? 'ACKNOWLEDGED' : 'PENDING'}
        </Text>
      </View>
      {resident.acknowledgedAt ? (
        <Text style={styles.acknowledgedAt}>{formatDateTime(resident.acknowledgedAt)}</Text>
      ) : null}
    </View>
  );
}

export default function AlertAcknowledgementsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alertId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [report, setReport] = useState<AlertAcknowledgementReport | null>(null);
  const [selectedTab, setSelectedTab] = useState<ResidentTab>('acknowledged');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadReport = useCallback(async (refresh = false) => {
    if (!token || !alertId) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage(null);

    try {
      const [alertDetails, acknowledgementReport] = await Promise.all([
        getAlertById(alertId, token),
        getAlertAcknowledgementReport(alertId, token),
      ]);
      setAlert(alertDetails);
      setReport(acknowledgementReport);
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected acknowledgement report screen error:', error);
      }

      setErrorMessage('Unable to load resident acknowledgements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alertId, token]);

  useFocusEffect(useCallback(() => {
    if (token && alertId && user && isAuthorityRole(user.role)) {
      void loadReport();
    } else if (!alertId) {
      setLoading(false);
      setErrorMessage('Unable to load resident acknowledgements.');
    }
  }, [alertId, loadReport, token, user]));

  const residents = useMemo(() => {
    if (!report) {
      return [];
    }

    return selectedTab === 'acknowledged'
      ? report.acknowledgedResidents
      : report.pendingResidents;
  }, [report, selectedTab]);

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
          <Text style={styles.title}>Resident Acknowledgements</Text>
          <StatusBanner
            message="Only authority users can view resident acknowledgement reports."
            type="error"
          />
          <AuthButton
            title="Back to Alerts"
            variant="secondary"
            onPress={() => router.replace('/alerts' as Href)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const summary = report?.summary ?? null;
  const rate = summary?.acknowledgementRate ?? null;
  const progressWidth = `${Math.max(0, Math.min(100, rate ?? 0))}%` as `${number}%`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadReport(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Resident Acknowledgements</Text>
            <Text style={styles.subtitle}>Track who has confirmed receipt of this emergency alert.</Text>
          </View>
        </View>

        {alert ? (
          <View style={styles.alertContextCard}>
            <Text numberOfLines={2} style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMeta}>{alert.affectedArea} • {alert.riskLevel} • {alert.status}</Text>
          </View>
        ) : null}

        {loading && !report ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateTitle}>Loading acknowledgements...</Text>
          </View>
        ) : null}

        {errorMessage && !report ? (
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>Unable to load resident acknowledgements.</Text>
            <Text style={styles.stateText}>Check your connection and try again.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Retry"
              variant="secondary"
              onPress={() => void loadReport()}
            />
          </View>
        ) : null}

        {report ? (
          <>
            {errorMessage ? <StatusBanner message={errorMessage} type="error" /> : null}
            <View style={styles.summaryGrid}>
              <SummaryCard label="Targeted Residents" value={metricText(summary?.targetedResidents)} />
              <SummaryCard label="Acknowledged" value={metricText(summary?.acknowledged)} />
              <SummaryCard label="Pending" value={metricText(summary?.pending)} />
            </View>

            <View style={styles.rateCard}>
              <View style={styles.rateTopRow}>
                <Text style={styles.rateLabel}>Acknowledgement Rate</Text>
                <Text style={styles.rateValue}>{rate === null ? 'Not available' : `${rate}%`}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Text style={styles.lastAcknowledged}>
                Last acknowledged: {summary?.lastAcknowledgedAt ? formatDateTime(summary.lastAcknowledgedAt) : 'Not available'}
              </Text>
            </View>

            <View style={styles.tabs}>
              {(['acknowledged', 'pending'] as const).map((tab) => {
                const selected = selectedTab === tab;
                const count = tab === 'acknowledged'
                  ? report.acknowledgedResidents.length
                  : report.pendingResidents.length;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={tab}
                    onPress={() => setSelectedTab(tab)}
                    style={({ pressed }) => [
                      styles.tabButton,
                      selected && styles.tabButtonSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.tabButtonText, selected && styles.tabButtonTextSelected]}>
                      {tab === 'acknowledged' ? 'Acknowledged' : 'Pending'} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.residentList}>
              {residents.length > 0 ? (
                residents.map((resident) => (
                  <ResidentRow key={resident.id} resident={resident} tab={selectedTab} />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    {selectedTab === 'acknowledged' ? 'No Acknowledgements Yet' : 'No Pending Residents'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {selectedTab === 'acknowledged'
                      ? 'Acknowledged residents will appear here.'
                      : 'All targeted residents have acknowledged this alert.'}
                  </Text>
                </View>
              )}
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
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  restrictedContent: {
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 20,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: BrandColors.navy,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  headerTextBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    color: BrandColors.navy,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  alertContextCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderLeftColor: BrandColors.red,
    borderLeftWidth: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  alertTitle: {
    color: BrandColors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  alertMeta: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
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
    padding: 20,
  },
  stateTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  stateText: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 4,
    width: '100%',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderTopColor: BrandColors.deepBlue,
    borderTopWidth: 3,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '30%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryValue: {
    color: BrandColors.navy,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
  },
  summaryLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  rateCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  rateTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  rateLabel: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  rateValue: {
    color: BrandColors.success,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  progressTrack: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: BrandColors.success,
    borderRadius: 999,
    height: '100%',
  },
  lastAcknowledged: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  tabs: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 5,
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 8,
  },
  tabButtonSelected: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  tabButtonText: {
    color: BrandColors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  tabButtonTextSelected: {
    color: BrandColors.white,
  },
  residentList: {
    gap: 8,
  },
  residentRow: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  residentIdentity: {
    gap: 2,
  },
  residentName: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  residentMeta: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  acknowledgedBadge: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
  },
  pendingBadge: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  acknowledgedBadgeText: {
    color: BrandColors.success,
  },
  pendingBadgeText: {
    color: BrandColors.deepBlue,
  },
  acknowledgedAt: {
    color: BrandColors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  emptyCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  emptyTitle: {
    color: BrandColors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  emptyText: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.72,
  },
});
