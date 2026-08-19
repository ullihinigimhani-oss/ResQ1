import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertStatusBadge, RiskBadge } from '@/components/alerts/alert-badges';
import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getAlertById, isAlertApiError } from '@/services/alertService';
import type { Alert } from '@/types/alert';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

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

function safetyInstructionLines(value: string) {
  const instructions = value
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);

  if (instructions.length > 0) {
    return instructions;
  }

  return ['Follow official evacuation and safety instructions from emergency authorities.'];
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function AlertDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alertId = firstParam(params.id);
  const published = firstParam(params.published) === '1';
  const { isLoading, token, user } = useAuth();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loadingAlert, setLoadingAlert] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const loadAlert = useCallback(async (refresh = false) => {
    if (!token || !alertId) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingAlert(true);
    }

    setErrorMessage(null);

    try {
      const alertDetails = await getAlertById(alertId, token);
      setAlert(alertDetails);
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert detail error:', error);
      }

      setErrorMessage('Unable to load this emergency alert.');
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
      setErrorMessage('Unable to load this emergency alert.');
    }
  }, [alertId, loadAlert, token]);

  const safetyInstructions = useMemo(
    () => safetyInstructionLines(alert?.safetyInstructions ?? ''),
    [alert?.safetyInstructions],
  );

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

  const showInitialLoading = loadingAlert && !alert;
  const showError = Boolean(errorMessage) && !alert && !showInitialLoading;
  const publishedAt = formatDateTime(alert?.createdAt ?? null);
  const expiresAt = formatDateTime(alert?.expiresAt ?? null);
  const critical = alert?.riskLevel === 'Critical';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
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
          <Text style={styles.topBarTitle}>Emergency Alert</Text>
        </View>

        {published ? <StatusBanner message="Emergency alert published successfully." type="success" /> : null}

        {errorMessage && alert ? <StatusBanner message={errorMessage} type="error" /> : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateTitle}>Loading alert details...</Text>
            <Text style={styles.stateText}>Retrieving the latest verified warning.</Text>
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
            <View style={[styles.warningPanel, critical && styles.criticalWarningPanel]}>
              <View style={styles.warningHeader}>
                <RiskBadge riskLevel={alert.riskLevel} />
                <AlertStatusBadge status={alert.status} />
              </View>
              <Text style={[styles.alertTitle, critical && styles.criticalAlertTitle]}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>

              <View style={styles.summaryGrid}>
                <SummaryItem label="Affected Area" value={alert.affectedArea} />
                <SummaryItem label="Disaster Type" value={alert.disasterType} />
                <SummaryItem label="Published" value={publishedAt ?? 'Not available'} />
                {expiresAt ? <SummaryItem label="Expires" value={expiresAt} /> : null}
              </View>
            </View>

            <View style={styles.safetyPanel}>
              <Text style={styles.sectionEyebrow}>Safety Instructions</Text>
              <Text style={[styles.sectionTitle, styles.safetyTitle]}>Follow these actions now</Text>
              <View style={styles.instructionList}>
                {safetyInstructions.map((instruction, index) => (
                  <View key={`${instruction}-${index}`} style={styles.instructionRow}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Alert Information</Text>
              <DetailRow label="Status" value={alert.status} />
              <DetailRow label="Risk Level" value={alert.riskLevel} />
              <DetailRow label="Affected Area" value={alert.affectedArea} />
              <DetailRow label="Disaster Type" value={alert.disasterType} />
              <DetailRow label="Published Time" value={publishedAt ?? 'Not available'} />
              <DetailRow label="Expiration Time" value={expiresAt ?? 'No expiration set'} />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Emergency Actions</Text>
              <Text style={styles.sectionCopy}>
                Use verified ResQ1 routes, shelters, and incident tools for this alert.
              </Text>
              {acknowledged ? (
                <StatusBanner
                  message="Alert acknowledged on this device only. Backend acknowledgement persistence is not connected in the current frontend service layer."
                  type="success"
                />
              ) : null}
              <View style={styles.actionButtons}>
                <AuthButton
                  title="View Safe Evacuation Route"
                  variant="secondary"
                  onPress={() => router.push('/shelters' as Href)}
                />
                <AuthButton
                  title="Find Nearest Safe Shelter"
                  variant="secondary"
                  onPress={() => router.push('/shelters' as Href)}
                />
                <AuthButton
                  title="Report Incident"
                  onPress={() => router.push('/incidents/report' as Href)}
                />
                <AuthButton
                  title={acknowledged ? 'Acknowledged' : 'Acknowledge Alert'}
                  variant="secondary"
                  onPress={() => setAcknowledged(true)}
                />
              </View>
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
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
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
  warningPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  criticalWarningPanel: {
    borderColor: BrandColors.red,
    borderTopColor: BrandColors.red,
    borderTopWidth: 6,
  },
  warningHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertTitle: {
    color: BrandColors.navy,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  criticalAlertTitle: {
    color: BrandColors.red,
  },
  alertMessage: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
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
  safetyPanel: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.deepBlue,
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 16,
  },
  sectionEyebrow: {
    color: BrandColors.sky,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  safetyTitle: {
    color: BrandColors.white,
  },
  sectionCopy: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  instructionList: {
    gap: 10,
  },
  instructionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  instructionNumber: {
    alignItems: 'center',
    backgroundColor: BrandColors.red,
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  instructionNumberText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  instructionText: {
    color: BrandColors.white,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
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
  actionButtons: {
    gap: 10,
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
});
