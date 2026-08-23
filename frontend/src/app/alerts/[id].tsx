import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { AppIcon } from '@/components/ui/app-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getAlertById, isAlertApiError } from '@/services/alertService';
import type { Alert } from '@/types/alert';
import { isAuthorityRole } from '@/utils/format';
import { preferredLanguageLabels, preferredLanguageOrNull, toPreferredLanguage } from '@/utils/language';

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
  const alertTone = alertToneForRisk(alert?.riskLevel);
  const selectedLanguage = routeLanguage ?? toPreferredLanguage(user.preferredLanguage);
  const showResidentLanguage = !isAuthorityRole(user.role);
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
            tintColor={BrandColors.red}
            onRefresh={() => void loadAlert(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <BackButton onPress={handleBackToAlerts} />
          <Text style={styles.topBarTitle}>Alert Details</Text>
        </View>

        {showResidentLanguage ? (
          <View style={styles.languageContext}>
            <Text style={styles.languageContextLabel}>Language</Text>
            <Text style={styles.languageContextValue}>{preferredLanguageLabels[selectedLanguage]}</Text>
          </View>
        ) : null}

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
            <View style={[styles.detailCard, { borderColor: alertTone.borderColor }]}>
              <View style={[styles.detailHero, { backgroundColor: alertTone.backgroundColor }]}>
                <View style={styles.detailHeroTitleRow}>
                  <View style={[styles.detailHeroIcon, { backgroundColor: alertTone.accent }]}>
                    <AppIcon fallback="!" name="exclamationmark.triangle.fill" size={30} tintColor={BrandColors.white} />
                  </View>
                  <Text style={[styles.detailHeroTitle, { color: alertTone.titleColor }]}>{alert.title}</Text>
                </View>
                <DetailPill
                  backgroundColor={BrandColors.lightBlue}
                  borderColor={BrandColors.sky}
                  label={alert.status}
                  textColor={BrandColors.deepBlue}
                />
              </View>

              <View style={styles.detailInfoList}>
                <DetailInfoRow fallback="A" label="Area" name="house.fill" value={alert.affectedArea} />
                <DetailInfoRow fallback="T" label="Emergency Type" name="exclamationmark.triangle.fill" value={alert.disasterType} />
                <DetailInfoRow fallback="R" label="Risk Level" name="gauge.with.dots.needle.33percent">
                  <DetailPill
                    backgroundColor={alertTone.pillBackground}
                    borderColor={alertTone.pillBorder}
                    label={alert.riskLevel}
                    textColor={alertTone.pillText}
                  />
                </DetailInfoRow>
                <DetailInfoRow fallback="D" label="Description" name="slider.horizontal.3" value={alert.message} />
                <DetailInfoRow fallback="I" label="Issued" name="clock.fill" value={publishedAt ?? 'Not available'} />
                {expiresAt ? (
                  <DetailInfoRow fallback="E" label="Expires" name="clock.fill" value={expiresAt} />
                ) : null}
                <DetailInfoRow fallback="S" label="Status" name="bell.fill">
                  <DetailPill
                    backgroundColor={BrandColors.lightBlue}
                    borderColor={BrandColors.sky}
                    label={alert.status}
                    textColor={BrandColors.deepBlue}
                  />
                </DetailInfoRow>
                <DetailInfoRow fallback="!" label="Safety Instructions" name="cross.case.fill">
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
    alignItems: 'center',
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    padding: 16,
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
  safetyBulletList: {
    gap: 4,
  },
  safetyBulletText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
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
});
