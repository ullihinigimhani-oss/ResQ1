import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
import { getAlertById, getAlertRiskHistory, isAlertApiError } from '@/services/alertService';
import type { Alert, AlertRiskHistoryPoint } from '@/types/alert';
import {
  alertDisplayThemeOrNull,
  alertDisplayThemeStyles,
  getResidentAlertDisplayTheme,
} from '@/utils/alert-display';
import { isAuthorityRole } from '@/utils/format';
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
  const [acknowledged, setAcknowledged] = useState(false);
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
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert detail error:', error);
      }

      setErrorMessage('Unable to load this emergency alert.');
    } finally {
      setLoadingAlert(false);
      setLoadingRiskHistory(false);
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

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{detailCopy.emergencyActions}</Text>
              <Text style={styles.sectionCopy}>
                {detailCopy.emergencyActionsCopy}
              </Text>
              {acknowledged ? (
                <StatusBanner
                  message={detailCopy.acknowledgedMessage}
                  type="success"
                />
              ) : null}
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
                <AuthButton
                  title={acknowledged ? detailCopy.acknowledged : detailCopy.acknowledgeAlert}
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
