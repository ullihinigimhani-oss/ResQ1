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
import { AppIcon } from '@/components/ui/app-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getAlertById, isAlertApiError } from '@/services/alertService';
import type { Alert, AlertRiskLevel } from '@/types/alert';
import type { PreferredLanguage } from '@/types/auth';
import {
  alertDisplayThemeOrNull,
  alertDisplayThemeStyles,
  getResidentAlertDisplayTheme,
  type AlertDisplayTheme,
} from '@/utils/alert-display';
import { formatDateTime as formatApiDateTime, isAuthorityRole } from '@/utils/format';
import {
  preferredLanguageLabels,
  preferredLanguageOrNull,
  residentAlertUiText,
  riskAssessmentUiText,
  toPreferredLanguage,
  translateAlertMessage,
  translateAlertStatus,
  translateAlertTitle,
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

function normalizeRiskLevel(value: AlertRiskLevel | string | null | undefined): AlertRiskLevel {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'critical') {
    return 'Critical';
  }

  if (normalized === 'high') {
    return 'High';
  }

  if (normalized === 'moderate' || normalized === 'medium') {
    return 'Moderate';
  }

  return 'Low';
}

function authorityDisplayTheme(riskLevel: AlertRiskLevel): AlertDisplayTheme {
  return riskLevel === 'Critical' || riskLevel === 'High' ? 'danger' : 'warning';
}

function splitSafetyInstructions(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function fallbackActionKeys(riskLevel: AlertRiskLevel): ('followAuthorityInstructions' | 'stayInformed')[] {
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    return ['followAuthorityInstructions', 'stayInformed'];
  }

  return ['stayInformed', 'followAuthorityInstructions'];
}

function assessmentConcernKey(riskLevel: AlertRiskLevel) {
  switch (riskLevel) {
    case 'Critical':
      return 'factorConcernCritical';
    case 'High':
      return 'factorConcernHigh';
    case 'Moderate':
      return 'factorConcernModerate';
    case 'Low':
    default:
      return 'factorConcernLow';
  }
}

function factorNote(
  riskLevel: AlertRiskLevel,
  copy: typeof riskAssessmentUiText.English,
  language: PreferredLanguage,
) {
  return `${copy.estimated} - ${translateRiskLevel(riskLevel, language)}`;
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

function FactorRow({
  fallback,
  label,
  name,
  note,
  toneColor,
  value,
}: {
  fallback: string;
  label: string;
  name: string;
  note: string;
  toneColor: string;
  value: string;
}) {
  return (
    <View style={styles.factorRow}>
      <View style={[styles.factorIcon, { borderColor: toneColor }]}>
        <AppIcon fallback={fallback} name={name} size={20} tintColor={toneColor} />
      </View>
      <View style={styles.factorTextBlock}>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={styles.factorValue}>{value}</Text>
        <Text style={styles.factorNote}>{note}</Text>
      </View>
    </View>
  );
}

export default function AlertRiskAssessmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alertId = firstParam(params.id);
  const routeLanguage = preferredLanguageOrNull(firstParam(params.language));
  const routeAlertDisplayTheme = alertDisplayThemeOrNull(firstParam(params.alertDisplayTheme));
  const { isLoading, token, user } = useAuth();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loadingAlert, setLoadingAlert] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const userLanguage = toPreferredLanguage(user?.preferredLanguage);
  const selectedLanguage = routeLanguage ?? userLanguage;
  const showResidentLanguage = user ? !isAuthorityRole(user.role) : true;
  const displayLanguage = showResidentLanguage ? selectedLanguage : 'English';
  const detailCopy = riskAssessmentUiText[displayLanguage];
  const residentCopy = residentAlertUiText[displayLanguage];

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
      setAlert(await getAlertById(alertId, token));
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected risk assessment load error:', error);
      }

      setErrorMessage(detailCopy.unableLoadAssessment);
    } finally {
      setLoadingAlert(false);
      setRefreshing(false);
    }
  }, [alertId, detailCopy.unableLoadAssessment, token]);

  useFocusEffect(useCallback(() => {
    if (token && alertId) {
      void loadAlert();
    } else if (!alertId) {
      setLoadingAlert(false);
      setErrorMessage(detailCopy.unableLoadAssessment);
    }
  }, [alertId, detailCopy.unableLoadAssessment, loadAlert, token]));

  const assessment = useMemo(() => {
    if (!alert) {
      return null;
    }

    const riskLevel = normalizeRiskLevel(alert.riskLevel);
    const translatedRisk = translateRiskLevel(riskLevel, displayLanguage);
    const concern = detailCopy[assessmentConcernKey(riskLevel)];
    const safetyInstructions = splitSafetyInstructions(alert.safetyInstructions)
      .map((instruction) => translateSafetyInstruction(instruction, displayLanguage));
    const recommendedActions = safetyInstructions.length > 0
      ? safetyInstructions
      : fallbackActionKeys(riskLevel).map((key) => detailCopy[key]);

    return {
      concern,
      note: factorNote(riskLevel, detailCopy, displayLanguage),
      recommendedActions,
      riskLevel,
      translatedRisk,
    };
  }, [alert, detailCopy, displayLanguage]);

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
  const displayTheme = alert
    ? routeAlertDisplayTheme ?? (
      showResidentLanguage
        ? getResidentAlertDisplayTheme(alert, user.location)
        : authorityDisplayTheme(normalizeRiskLevel(alert.riskLevel))
    )
    : routeAlertDisplayTheme ?? 'danger';
  const theme = alertDisplayThemeStyles[displayTheme];
  const issuedAt = formatDateTime(alert?.createdAt ?? null);

  const handleBackToDetails = () => {
    router.replace({
      pathname: '/alerts/[id]',
      params: {
        id: alert ? String(alert.id) : String(alertId ?? ''),
        language: selectedLanguage,
        alertDisplayTheme: displayTheme,
      },
    } as unknown as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.accent}
            onRefresh={() => void loadAlert(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <DetailBackButton label={alertDetailBackLabel(displayLanguage)} onPress={handleBackToDetails} />
          <Text style={styles.topBarTitle}>{detailCopy.riskAssessment}</Text>
        </View>

        {showResidentLanguage ? (
          <View style={styles.languageContext}>
            <Text style={styles.languageContextLabel}>{residentCopy.language}</Text>
            <Text style={styles.languageContextValue}>{preferredLanguageLabels[displayLanguage]}</Text>
          </View>
        ) : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateTitle}>{detailCopy.loadingAssessment}</Text>
            <Text style={styles.stateText}>{detailCopy.basedOnSelectedAlert}</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>{detailCopy.unableLoadAssessment}</Text>
            <Text style={styles.stateText}>{detailCopy.checkConnection}</Text>
            <AuthButton
              style={styles.stateButton}
              title={alertDetailRetryLabel(displayLanguage)}
              variant="secondary"
              onPress={() => void loadAlert()}
            />
          </View>
        ) : null}

        {errorMessage && alert ? <StatusBanner message={detailCopy.unableLoadAssessment} type="error" /> : null}

        {alert && assessment ? (
          <>
            <View style={[styles.summaryCard, { borderColor: theme.borderColor }]}>
              <View style={[styles.summaryHero, { backgroundColor: theme.backgroundColor }]}>
                <View style={styles.summaryTopRow}>
                  <View style={[styles.summaryIcon, { backgroundColor: theme.accent }]}>
                    <AppIcon fallback="R" name="gauge.fill" size={26} tintColor={BrandColors.white} />
                  </View>
                  <View style={styles.summaryTitleBlock}>
                    <Text style={styles.summaryEyebrow}>{detailCopy.currentAssessment}</Text>
                    <Text numberOfLines={2} style={[styles.summaryTitle, { color: theme.titleColor }]}>
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

                <View style={styles.summaryMetaGrid}>
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>{detailCopy.alertArea}</Text>
                    <Text style={styles.metaValue}>{alert.affectedArea}</Text>
                  </View>
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>{detailCopy.currentRiskLevel}</Text>
                    <Text style={[styles.metaValue, { color: theme.titleColor }]}>
                      {assessment.translatedRisk}
                    </Text>
                  </View>
                </View>
                {issuedAt ? <Text style={styles.summaryIssued}>{issuedAt}</Text> : null}
              </View>

              <View style={styles.summaryBody}>
                <Text style={styles.summaryBodyText}>{translateAlertMessage(alert, displayLanguage)}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{detailCopy.coreEnvironmentalFactors}</Text>
                <Text style={styles.sectionCopy}>{detailCopy.environmentalSummary}</Text>
              </View>
              <View style={styles.factorList}>
                <FactorRow
                  fallback="R"
                  label={detailCopy.rainfallIndex}
                  name="cloud.rain.fill"
                  note={assessment.note}
                  toneColor={theme.accent}
                  value={assessment.concern}
                />
                <FactorRow
                  fallback="W"
                  label={detailCopy.riverWaterLevels}
                  name="drop.fill"
                  note={assessment.note}
                  toneColor={theme.accent}
                  value={assessment.concern}
                />
                <FactorRow
                  fallback="S"
                  label={detailCopy.soilSaturation}
                  name="slider.horizontal.3"
                  note={assessment.note}
                  toneColor={theme.accent}
                  value={assessment.concern}
                />
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{detailCopy.recommendedActions}</Text>
              <View style={styles.actionList}>
                {assessment.recommendedActions.map((action, index) => (
                  <View key={`${action}-${index}`} style={styles.actionRow}>
                    <View style={[styles.actionBullet, { backgroundColor: theme.accent }]} />
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function alertDetailBackLabel(language: PreferredLanguage) {
  switch (language) {
    case 'Sinhala':
      return 'ආපසු';
    case 'Tamil':
      return 'பின்';
    case 'English':
    default:
      return 'Back';
  }
}

function alertDetailRetryLabel(language: PreferredLanguage) {
  switch (language) {
    case 'Sinhala':
      return 'නැවත උත්සාහ කරන්න';
    case 'Tamil':
      return 'மீண்டும் முயற்சி';
    case 'English':
    default:
      return 'Retry';
  }
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
  summaryCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryHero: {
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    gap: 14,
    padding: 16,
  },
  summaryTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryTitleBlock: {
    flex: 1,
    gap: 3,
    minWidth: 150,
  },
  summaryEyebrow: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
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
  summaryMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBlock: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minWidth: '47%',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metaLabel: {
    color: BrandColors.muted,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: BrandColors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  summaryIssued: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  summaryBody: {
    padding: 14,
  },
  summaryBodyText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  sectionHeader: {
    gap: 5,
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
    fontWeight: '700',
    lineHeight: 19,
  },
  factorList: {
    gap: 8,
  },
  factorRow: {
    alignItems: 'flex-start',
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  factorIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  factorTextBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  factorLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  factorValue: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  factorNote: {
    color: BrandColors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  actionList: {
    gap: 9,
  },
  actionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  actionBullet: {
    borderRadius: 4,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  actionText: {
    color: BrandColors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
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
