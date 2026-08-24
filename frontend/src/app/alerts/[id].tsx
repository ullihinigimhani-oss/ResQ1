import { StatusBar } from 'expo-status-bar';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
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

import { FloodRiskTrendChart } from '@/components/alerts/flood-risk-trend-chart';
import { AuthButton, StatusBanner } from '@/components/common/auth-components';
import { AppIcon } from '@/components/ui/app-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import {
  acknowledgeAlert as acknowledgeAlertRequest,
  getAlertAcknowledgement,
  getAlertAcknowledgementReport,
  getAlertById,
  getAlertRiskHistory,
  isAlertApiError,
} from '@/services/alertService';
import type {
  Alert,
  AlertAcknowledgementReport,
  AlertAcknowledgementStatus,
  AlertRiskHistoryPoint,
} from '@/types/alert';
import {
  alertDisplayThemeOrNull,
  alertDisplayThemeStyles,
  getResidentAlertDisplayTheme,
} from '@/utils/alert-display';
import { formatDateTime as formatApiDateTime, isAuthorityRole } from '@/utils/format';
import {
  alertDetailUiText,
  fallbackSafetyInstruction,
  preferredLanguageLabels,
  preferredLanguageOrNull,
  residentAlertUiText,
  toPreferredLanguage,
  translateAlertAudience,
  translateAlertMessage,
  translateAlertStatus,
  translateAlertTitle,
  translateDisasterType,
  translateRiskLevel,
  translateSafetyInstruction,
} from '@/utils/language';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  return formatApiDateTime(value);
}

function safetyInstructionLines(value: string, fallback: string) {
  const instructions = value
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);

  if (instructions.length > 0) {
    return instructions;
  }

  return [fallback];
}

function alertToneForRisk(riskLevel: Alert['riskLevel'] | undefined) {
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    return {
      accent: BrandColors.red,
      backgroundColor: BrandColors.redSoft,
      borderColor: BrandColors.red,
      pillBackground: BrandColors.redSoft,
      pillBorder: BrandColors.red,
      pillText: BrandColors.red,
      titleColor: BrandColors.red,
    };
  }

  if (riskLevel === 'Moderate') {
    return {
      accent: '#B7791F',
      backgroundColor: BrandColors.warningSoft,
      borderColor: '#D69E2E',
      pillBackground: BrandColors.warningSoft,
      pillBorder: '#D69E2E',
      pillText: '#7A4B00',
      titleColor: '#8A4B00',
    };
  }

  return {
    accent: BrandColors.deepBlue,
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    pillBackground: BrandColors.lightBlue,
    pillBorder: BrandColors.sky,
    pillText: BrandColors.deepBlue,
    titleColor: BrandColors.deepBlue,
  };
}

function DetailPill({
  backgroundColor,
  borderColor,
  label,
  textColor,
}: {
  backgroundColor: string;
  borderColor: string;
  label: string;
  textColor: string;
}) {
  return (
    <View style={[styles.detailPill, { backgroundColor, borderColor }]}>
      <Text style={[styles.detailPillText, { color: textColor }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function DetailBackButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <Text style={styles.backButtonText}>{label}</Text>
    </Pressable>
  );
}

function DetailInfoRow({
  children,
  fallback,
  label,
  name,
  value,
}: {
  children?: ReactNode;
  fallback: string;
  label: string;
  name: string;
  value?: string;
}) {
  return (
    <View style={styles.detailInfoRow}>
      <View style={styles.detailIcon}>
        <AppIcon fallback={fallback} name={name} size={22} tintColor={BrandColors.navy} />
      </View>
      <View style={styles.detailInfoTextBlock}>
        <Text style={styles.detailInfoLabel}>{label}</Text>
        {value ? <Text style={styles.detailInfoValue}>{value}</Text> : children}
      </View>
    </View>
  );
}

function metricText(value: number | null | undefined, fallback: string) {
  return value === null || value === undefined ? fallback : String(value);
}

function AcknowledgementPanel({
  acknowledgement,
  detailCopy,
  errorMessage,
  loading,
  onAcknowledge,
  submitting,
}: {
  acknowledgement: AlertAcknowledgementStatus | null;
  detailCopy: typeof alertDetailUiText.English;
  errorMessage: string | null;
  loading: boolean;
  onAcknowledge: () => void;
  submitting: boolean;
}) {
  const acknowledged = acknowledgement?.acknowledged ?? false;
  const acknowledgedAt = formatDateTime(acknowledgement?.acknowledgedAt ?? null);

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{detailCopy.acknowledgement}</Text>
      {loading ? (
        <View style={styles.inlineLoadingRow}>
          <ActivityIndicator color={BrandColors.red} />
          <Text style={styles.sectionCopy}>{detailCopy.acknowledgementLoading}</Text>
        </View>
      ) : acknowledged ? (
        <View style={styles.acknowledgedCard}>
          <Text style={styles.acknowledgedTitle}>✓ {detailCopy.alertAcknowledged}</Text>
          <Text style={styles.acknowledgedText}>{detailCopy.acknowledgedMessage}</Text>
          {acknowledgedAt ? (
            <View style={styles.acknowledgedTimeBlock}>
              <Text style={styles.acknowledgedTimeLabel}>{detailCopy.acknowledgedAt}</Text>
              <Text style={styles.acknowledgedTimeText}>{acknowledgedAt}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <Text style={styles.sectionCopy}>{detailCopy.acknowledgementQuestion}</Text>
          {errorMessage ? <StatusBanner message={errorMessage} type="error" /> : null}
          {errorMessage && !acknowledgement ? null : (
            <AuthButton
              disabled={submitting}
              loading={submitting}
              title={`✓ ${detailCopy.acknowledgeAlert}`}
              onPress={onAcknowledge}
            />
          )}
        </>
      )}
    </View>
  );
}

function AuthorityAcknowledgementPanel({
  detailCopy,
  errorMessage,
  loading,
  onViewAcknowledgements,
  report,
}: {
  detailCopy: typeof alertDetailUiText.English;
  errorMessage: string | null;
  loading: boolean;
  onViewAcknowledgements: () => void;
  report: AlertAcknowledgementReport | null;
}) {
  const summary = report?.summary ?? null;
  const targetedResidents = summary?.targetedResidents ?? null;
  const acknowledged = summary?.acknowledged ?? 0;
  const pending = summary?.pending ?? null;
  const rate = summary?.acknowledgementRate ?? null;
  const progressWidth = `${Math.max(0, Math.min(100, rate ?? 0))}%` as `${number}%`;

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{detailCopy.acknowledgementStatus}</Text>
      {loading ? (
        <View style={styles.inlineLoadingRow}>
          <ActivityIndicator color={BrandColors.red} />
          <Text style={styles.sectionCopy}>{detailCopy.acknowledgementMetricsLoading}</Text>
        </View>
      ) : errorMessage ? (
        <StatusBanner message={errorMessage} type="error" />
      ) : (
        <>
          <View style={styles.ackMetricGrid}>
            <View style={styles.ackMetricCard}>
              <Text style={styles.ackMetricLabel}>{detailCopy.targetedResidents}</Text>
              <Text style={styles.ackMetricValue}>{metricText(targetedResidents, detailCopy.notAvailable)}</Text>
            </View>
            <View style={styles.ackMetricCard}>
              <Text style={styles.ackMetricLabel}>{detailCopy.acknowledged}</Text>
              <Text style={styles.ackMetricValue}>{acknowledged}</Text>
            </View>
            <View style={styles.ackMetricCard}>
              <Text style={styles.ackMetricLabel}>{detailCopy.pending}</Text>
              <Text style={styles.ackMetricValue}>{metricText(pending, detailCopy.notAvailable)}</Text>
            </View>
          </View>
          <View style={styles.ackRateBlock}>
            <View style={styles.ackRateTopRow}>
              <Text style={styles.ackMetricLabel}>{detailCopy.acknowledgementRate}</Text>
              <Text style={styles.ackRateText}>{rate === null ? detailCopy.notAvailable : `${rate}%`}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
          <View style={styles.lastAcknowledgedRow}>
            <Text style={styles.ackMetricLabel}>{detailCopy.lastAcknowledged}</Text>
            <Text style={styles.lastAcknowledgedText}>
              {summary?.lastAcknowledgedAt ? formatDateTime(summary.lastAcknowledgedAt) : detailCopy.notAvailable}
            </Text>
          </View>
          <AuthButton
            title={detailCopy.viewAcknowledgements}
            variant="secondary"
            onPress={onViewAcknowledgements}
          />
        </>
      )}
    </View>
  );
}

export default function AlertDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alertId = firstParam(params.id);
  const published = firstParam(params.published) === '1';
  const routeLanguage = preferredLanguageOrNull(firstParam(params.language));
  const routeAlertDisplayTheme = alertDisplayThemeOrNull(firstParam(params.alertDisplayTheme));
  const { isLoading, token, user } = useAuth();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [riskHistory, setRiskHistory] = useState<AlertRiskHistoryPoint[]>([]);
  const [loadingRiskHistory, setLoadingRiskHistory] = useState(false);
  const [riskHistoryError, setRiskHistoryError] = useState(false);
  const [loadingAlert, setLoadingAlert] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<AlertAcknowledgementStatus | null>(null);
  const [loadingAcknowledgement, setLoadingAcknowledgement] = useState(false);
  const [acknowledgementError, setAcknowledgementError] = useState<string | null>(null);
  const [submittingAcknowledgement, setSubmittingAcknowledgement] = useState(false);
  const [acknowledgementReport, setAcknowledgementReport] = useState<AlertAcknowledgementReport | null>(null);
  const [loadingAcknowledgementReport, setLoadingAcknowledgementReport] = useState(false);
  const [acknowledgementReportError, setAcknowledgementReportError] = useState<string | null>(null);
  const userLanguage = toPreferredLanguage(user?.preferredLanguage);
  const selectedLanguage = routeLanguage ?? userLanguage;
  const showResidentLanguage = user ? !isAuthorityRole(user.role) : true;
  const displayLanguage = showResidentLanguage ? selectedLanguage : 'English';
  const detailCopy = alertDetailUiText[displayLanguage];
  const residentListCopy = residentAlertUiText[displayLanguage];

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
    setRiskHistoryError(false);
    setLoadingRiskHistory(true);
    setAcknowledgementError(null);
    setAcknowledgementReportError(null);
    setLoadingAcknowledgement(showResidentLanguage);
    setLoadingAcknowledgementReport(!showResidentLanguage);

    try {
      const alertDetails = await getAlertById(alertId, token);
      setAlert(alertDetails);

      try {
        setRiskHistory(await getAlertRiskHistory(alertId, token));
      } catch (historyError) {
        if (__DEV__ && !isAlertApiError(historyError)) {
          console.warn('Unexpected alert risk history error:', historyError);
        }

        setRiskHistory([]);
        setRiskHistoryError(true);
      }

      if (showResidentLanguage) {
        try {
          setAcknowledgement(await getAlertAcknowledgement(alertId, token));
        } catch (acknowledgementLoadError) {
          if (__DEV__ && !isAlertApiError(acknowledgementLoadError)) {
            console.warn('Unexpected acknowledgement status error:', acknowledgementLoadError);
          }

          setAcknowledgement(null);
          setAcknowledgementError(detailCopy.unableAcknowledge);
        }
      } else {
        try {
          setAcknowledgementReport(await getAlertAcknowledgementReport(alertId, token));
        } catch (reportError) {
          if (__DEV__ && !isAlertApiError(reportError)) {
            console.warn('Unexpected acknowledgement report error:', reportError);
          }

          setAcknowledgementReport(null);
          setAcknowledgementReportError(detailCopy.acknowledgementMetricsError);
        }
      }
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert detail error:', error);
      }

      setErrorMessage('Unable to load this emergency alert.');
    } finally {
      setLoadingAlert(false);
      setLoadingRiskHistory(false);
      setLoadingAcknowledgement(false);
      setLoadingAcknowledgementReport(false);
      setRefreshing(false);
    }
  }, [
    alertId,
    detailCopy.acknowledgementMetricsError,
    detailCopy.unableAcknowledge,
    showResidentLanguage,
    token,
  ]);

  useFocusEffect(useCallback(() => {
    if (token && alertId) {
      void loadAlert();
    } else if (!alertId) {
      setLoadingAlert(false);
      setErrorMessage('Unable to load this emergency alert.');
    }
  }, [alertId, loadAlert, token]));

  const safetyInstructions = useMemo(
    () => safetyInstructionLines(
      alert?.safetyInstructions ?? '',
      fallbackSafetyInstruction(displayLanguage),
    ).map((instruction) => translateSafetyInstruction(instruction, displayLanguage)),
    [alert?.safetyInstructions, displayLanguage],
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
  const residentAlertDisplayTheme = routeAlertDisplayTheme ?? (
    alert ? getResidentAlertDisplayTheme(alert, user.location) : 'danger'
  );
  const alertTone = showResidentLanguage
    ? alertDisplayThemeStyles[residentAlertDisplayTheme]
    : alertToneForRisk(alert?.riskLevel);
  const handleBackToAlerts = () => {
    if (showResidentLanguage) {
      router.replace({
        pathname: '/alerts',
        params: { language: selectedLanguage },
      } as unknown as Href);
      return;
    }

    router.replace('/alerts' as Href);
  };

  const handleAcknowledge = async () => {
    if (!token || !alertId || acknowledgement?.acknowledged || submittingAcknowledgement) {
      return;
    }

    setSubmittingAcknowledgement(true);
    setAcknowledgementError(null);

    try {
      setAcknowledgement(await acknowledgeAlertRequest(alertId, token));
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected acknowledge alert error:', error);
      }

      setAcknowledgementError(detailCopy.unableAcknowledge);
    } finally {
      setSubmittingAcknowledgement(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={alertTone.accent}
            onRefresh={() => void loadAlert(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <DetailBackButton label={detailCopy.back} onPress={handleBackToAlerts} />
          <Text style={styles.topBarTitle}>{detailCopy.alertDetails}</Text>
        </View>

        {showResidentLanguage ? (
          <View style={styles.languageContext}>
            <Text style={styles.languageContextLabel}>{detailCopy.language}</Text>
            <Text style={styles.languageContextValue}>{preferredLanguageLabels[displayLanguage]}</Text>
          </View>
        ) : null}

        {published ? <StatusBanner message={detailCopy.publishedSuccess} type="success" /> : null}

        {errorMessage && alert ? <StatusBanner message={detailCopy.unableLoadAlert} type="error" /> : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateTitle}>{detailCopy.loadingTitle}</Text>
            <Text style={styles.stateText}>{detailCopy.loadingBody}</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>{detailCopy.unableLoadAlert}</Text>
            <Text style={styles.stateText}>{detailCopy.checkConnection}</Text>
            <AuthButton
              style={styles.stateButton}
              title={detailCopy.retry}
              variant="secondary"
              onPress={() => void loadAlert()}
            />
          </View>
        ) : null}

        {alert ? (
          <>
            <View style={[styles.detailCard, { borderColor: alertTone.borderColor }]}>
              <View style={[styles.detailHero, { backgroundColor: alertTone.backgroundColor }]}>
                <View style={styles.detailHeroTopRow}>
                  <View style={styles.detailHeroTitleRow}>
                    <View style={[styles.detailHeroIcon, { backgroundColor: alertTone.accent }]}>
                      <AppIcon fallback="!" name="exclamationmark.triangle.fill" size={30} tintColor={BrandColors.white} />
                    </View>
                    <Text style={[styles.detailHeroTitle, { color: alertTone.titleColor }]}>
                      {translateAlertTitle(alert, displayLanguage)}
                    </Text>
                  </View>
                  <DetailPill
                    backgroundColor={BrandColors.lightBlue}
                    borderColor={BrandColors.sky}
                    label={translateAlertStatus(alert.status, displayLanguage)}
                    textColor={BrandColors.deepBlue}
                  />
                </View>
                {showResidentLanguage ? (
                  <View style={styles.detailHeroMetaRow}>
                    <Text style={[styles.detailDisplayBadge, { backgroundColor: alertTone.accent }]}>
                      {residentAlertDisplayTheme === 'danger' ? residentListCopy.yourArea : residentListCopy.warning}
                    </Text>
                    <Text style={[styles.detailHeroRiskText, { color: alertTone.titleColor }]}>
                      {residentListCopy.risk}: {translateRiskLevel(alert.riskLevel, displayLanguage)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.riskTrendTopSection}>
                <FloodRiskTrendChart
                  error={riskHistoryError}
                  history={riskHistory}
                  language={displayLanguage}
                  loading={loadingRiskHistory}
                  riskLevel={alert.riskLevel}
                />
              </View>

              <View style={styles.detailInfoList}>
                <DetailInfoRow fallback="A" label={detailCopy.area} name="house.fill" value={alert.affectedArea} />
                {alert.alertAudience !== 'GENERAL_PUBLIC' ? (
                  <DetailInfoRow
                    fallback="G"
                    label={detailCopy.alertAudience}
                    name="bell.fill"
                    value={translateAlertAudience(alert.alertAudience, displayLanguage)}
                  />
                ) : null}
                {alert.alertAudience === 'SCHOOL_EMERGENCY' && alert.schools.length > 0 ? (
                  <DetailInfoRow
                    fallback="S"
                    label={`${detailCopy.selectedSchools} (${alert.schools.length})`}
                    name="house.fill">
                    <View style={styles.schoolList}>
                      {alert.schools.map((school) => (
                        <Text key={school.id} style={styles.schoolListText}>
                          - {school.schoolName}
                        </Text>
                      ))}
                    </View>
                  </DetailInfoRow>
                ) : null}
                <DetailInfoRow
                  fallback="T"
                  label={detailCopy.emergencyType}
                  name="exclamationmark.triangle.fill"
                  value={translateDisasterType(alert.disasterType, displayLanguage)}
                />
                <DetailInfoRow
                  fallback="D"
                  label={detailCopy.description}
                  name="slider.horizontal.3"
                  value={translateAlertMessage(alert, displayLanguage)}
                />
                <DetailInfoRow fallback="I" label={detailCopy.issued} name="clock.fill" value={publishedAt ?? ''} />
                {expiresAt ? (
                  <DetailInfoRow fallback="E" label={detailCopy.expires} name="clock.fill" value={expiresAt} />
                ) : null}
                <DetailInfoRow fallback="S" label={detailCopy.status} name="bell.fill">
                  <DetailPill
                    backgroundColor={BrandColors.lightBlue}
                    borderColor={BrandColors.sky}
                    label={translateAlertStatus(alert.status, displayLanguage)}
                    textColor={BrandColors.deepBlue}
                  />
                </DetailInfoRow>
                <DetailInfoRow fallback="!" label={detailCopy.safetyInstructions} name="cross.case.fill">
                  <View style={styles.safetyBulletList}>
                    {safetyInstructions.map((instruction, index) => (
                      <Text key={`${instruction}-${index}`} style={styles.safetyBulletText}>
                        - {instruction}
                      </Text>
                    ))}
                  </View>
                </DetailInfoRow>
              </View>
            </View>

            {showResidentLanguage ? (
              <AcknowledgementPanel
                acknowledgement={acknowledgement}
                detailCopy={detailCopy}
                errorMessage={acknowledgementError}
                loading={loadingAcknowledgement}
                onAcknowledge={handleAcknowledge}
                submitting={submittingAcknowledgement}
              />
            ) : (
              <AuthorityAcknowledgementPanel
                detailCopy={detailCopy}
                errorMessage={acknowledgementReportError}
                loading={loadingAcknowledgementReport}
                onViewAcknowledgements={() => router.push({
                  pathname: '/alerts/[id]/acknowledgements',
                  params: { id: String(alert.id) },
                } as unknown as Href)}
                report={acknowledgementReport}
              />
            )}

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{detailCopy.emergencyActions}</Text>
              <Text style={styles.sectionCopy}>
                {detailCopy.emergencyActionsCopy}
              </Text>
              <View style={styles.actionButtons}>
                <AuthButton
                  title={detailCopy.viewSafeEvacuationRoute}
                  variant="secondary"
                  onPress={() => router.push('/shelters' as Href)}
                />
                <AuthButton
                  title={detailCopy.findNearestSafeShelter}
                  variant="secondary"
                  onPress={() => router.push('/shelters' as Href)}
                />
                <AuthButton
                  title={detailCopy.reportIncident}
                  onPress={() => router.push('/incidents/report' as Href)}
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
  languageContext: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  languageContextLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  languageContextValue: {
    color: BrandColors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  detailCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailHero: {
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    gap: 12,
    padding: 16,
  },
  detailHeroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  detailHeroMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailHeroTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  detailHeroIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  detailHeroTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  detailDisplayBadge: {
    borderRadius: 4,
    color: BrandColors.white,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  detailHeroRiskText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  detailPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  detailPillText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  detailInfoList: {
    paddingHorizontal: 16,
  },
  detailInfoRow: {
    alignItems: 'flex-start',
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  detailIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    width: 28,
  },
  detailInfoTextBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  detailInfoLabel: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  detailInfoValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  riskTrendTopSection: {
    backgroundColor: BrandColors.background,
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  safetyBulletList: {
    gap: 4,
  },
  safetyBulletText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  schoolList: {
    gap: 4,
  },
  schoolListText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  sectionCopy: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  inlineLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 42,
  },
  acknowledgedCard: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  acknowledgedTitle: {
    color: BrandColors.success,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  acknowledgedText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  acknowledgedTimeBlock: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  acknowledgedTimeLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  acknowledgedTimeText: {
    color: BrandColors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  ackMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ackMetricCard: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: '30%',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  ackMetricLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  ackMetricValue: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  ackRateBlock: {
    gap: 8,
  },
  ackRateTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  ackRateText: {
    color: BrandColors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
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
  lastAcknowledgedRow: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  lastAcknowledgedText: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
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
  pressed: {
    opacity: 0.72,
  },
});
