import { StatusBar } from 'expo-status-bar';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type GestureResponderEvent,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, BottomNavigation, EmptyState, LoadingState, PrimaryButton } from '@/components/ui/app-components';
import { colors, radius, shadows, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getActiveAlerts, getAlertPreferences, isAlertApiError, updateAlert } from '@/services/alertService';
import type { Alert, AlertAudience, AlertRiskLevel } from '@/types/alert';
import type { AlertPreferences } from '@/types/alertPreference';
import type { PreferredLanguage } from '@/types/auth';
import {
  alertDisplayThemeStyles,
  getResidentAlertDisplayTheme,
  normalizeAlertArea,
  type AlertDisplayTheme,
} from '@/utils/alert-display';
import { formatDateTime, isAuthorityRole } from '@/utils/format';
import {
  preferredLanguageLabels,
  preferredLanguageOrNull,
  preferredLanguages,
  residentAlertUiText,
  toPreferredLanguage,
  translateAlertMessage,
  translateAlertStatus,
  translateAlertTitle,
  translateDisasterType,
  translateRiskLevel,
} from '@/utils/language';

type ResidentAlertTab = Extract<AlertAudience, 'GENERAL_PUBLIC' | 'SCHOOL_EMERGENCY'>;
const allDisasterTypesFilter = 'ALL_DISASTER_TYPES';
const allLocationsFilter = 'ALL_LOCATIONS';
const myAreaFilter = 'MY_AREA';

type DisasterTypeFilterValue =
  | typeof allDisasterTypesFilter
  | `DISASTER:${string}`;

type LocationFilterValue =
  | typeof allLocationsFilter
  | typeof myAreaFilter
  | `LOCATION:${string}`;

type DashboardStateProps = {
  alerts: Alert[];
  errorMessage: string | null;
  loadingAlerts: boolean;
  onRetry: () => void;
  onViewAlert: (alertId: number, language?: PreferredLanguage, alertDisplayTheme?: AlertDisplayTheme) => void;
};

type ResidentDashboardProps = DashboardStateProps & {
  onAlertTabChange: (tab: ResidentAlertTab) => void;
  onLanguageChange: (language: PreferredLanguage) => void;
  onOpenPreferences: () => void;
  residentArea: string | null;
  schoolAlertsEnabled: boolean;
  selectedAlertTab: ResidentAlertTab;
  selectedLanguage: PreferredLanguage;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const severityRank: Record<AlertRiskLevel, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
};

function issuedTimestamp(alert: Alert) {
  const timestamp = new Date(alert.createdAt).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareAlertsBySeverity(left: Alert, right: Alert) {
  const severityDelta = (severityRank[right.riskLevel] ?? 0) - (severityRank[left.riskLevel] ?? 0);

  if (severityDelta !== 0) {
    return severityDelta;
  }

  return issuedTimestamp(right) - issuedTimestamp(left);
}

function formatCompactDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function disasterTypeFilterFor(disasterType: string): DisasterTypeFilterValue {
  return `DISASTER:${disasterType.trim()}`;
}

function disasterTypeFromFilter(filter: DisasterTypeFilterValue) {
  return filter.startsWith('DISASTER:') ? filter.replace(/^DISASTER:/, '') : null;
}

function locationFilterFor(location: string): LocationFilterValue {
  return `LOCATION:${location.trim()}`;
}

function locationFromFilter(filter: LocationFilterValue) {
  return filter.startsWith('LOCATION:') ? filter.replace(/^LOCATION:/, '') : null;
}

function searchableText(value: string | number | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function uniqueAlertDisasterTypes(alerts: Alert[]) {
  const disasterTypeByKey = new Map<string, string>();

  alerts.forEach((alert) => {
    const disasterType = String(alert.disasterType ?? '').trim();
    const key = searchableText(disasterType);

    if (disasterType && key && !disasterTypeByKey.has(key)) {
      disasterTypeByKey.set(key, disasterType);
    }
  });

  return [...disasterTypeByKey.values()].sort((left, right) => left.localeCompare(right));
}

function uniqueAlertLocations(alerts: Alert[]) {
  const locationByKey = new Map<string, string>();

  alerts.forEach((alert) => {
    const location = alert.affectedArea.trim();
    const key = normalizeAlertArea(location);

    if (location && key && !locationByKey.has(key)) {
      locationByKey.set(key, location);
    }
  });

  return [...locationByKey.values()].sort((left, right) => left.localeCompare(right));
}

function alertMatchesSearch(
  alert: Alert,
  searchQuery: string,
  language: PreferredLanguage,
) {
  const query = searchableText(searchQuery);

  if (!query) {
    return true;
  }

  const searchableAlertText = [
    alert.title,
    translateAlertTitle(alert, language),
    alert.disasterType,
    translateDisasterType(alert.disasterType, language),
    alert.affectedArea,
    alert.message,
    translateAlertMessage(alert, language),
    alert.safetyInstructions,
    ...alert.schools.map((school) => school.schoolName),
  ].map(searchableText).join(' ');

  return searchableAlertText.includes(query);
}

function alertMatchesDisasterTypeFilter(
  alert: Alert,
  disasterTypeFilter: DisasterTypeFilterValue,
) {
  if (disasterTypeFilter === allDisasterTypesFilter) {
    return true;
  }

  const selectedDisasterType = disasterTypeFromFilter(disasterTypeFilter);

  if (!selectedDisasterType) {
    return true;
  }

  return searchableText(alert.disasterType) === searchableText(selectedDisasterType);
}

function alertMatchesLocationFilter(
  alert: Alert,
  locationFilter: LocationFilterValue,
  residentArea: string | null,
) {
  if (locationFilter === allLocationsFilter) {
    return true;
  }

  if (locationFilter === myAreaFilter) {
    return getResidentAlertDisplayTheme(alert, residentArea) === 'danger';
  }

  const selectedLocation = locationFromFilter(locationFilter);

  if (!selectedLocation) {
    return true;
  }

  return normalizeAlertArea(alert.affectedArea) === normalizeAlertArea(selectedLocation);
}

function isCriticalAlert(alert: Alert) {
  return alert.riskLevel === 'Critical';
}

const authoritySeverityTheme: Record<AlertRiskLevel, {
  accent: string;
  badgeBackground: string;
  badgeBorder: string;
  badgeText: string;
}> = {
  Critical: {
    accent: colors.red,
    badgeBackground: colors.redSoft,
    badgeBorder: colors.red,
    badgeText: colors.red,
  },
  High: {
    accent: colors.orange,
    badgeBackground: colors.orangeSoft,
    badgeBorder: colors.orange,
    badgeText: colors.orangeText,
  },
  Moderate: {
    accent: colors.amber,
    badgeBackground: colors.amberSoft,
    badgeBorder: colors.amber,
    badgeText: colors.amberText,
  },
  Low: {
    accent: colors.success,
    badgeBackground: colors.successSoft,
    badgeBorder: colors.success,
    badgeText: colors.success,
  },
};

function AlertAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.alertAction, pressed && styles.pressed]}>
      <Text style={styles.alertActionText}>{label}</Text>
    </Pressable>
  );
}

function ResidentStatusBadge({
  language,
  status,
}: {
  language: PreferredLanguage;
  status: string;
}) {
  return (
    <View style={styles.residentStatusBadge}>
      <Text style={styles.residentStatusBadgeText}>{translateAlertStatus(status, language)}</Text>
    </View>
  );
}

function ResidentLanguageSelector({
  onChange,
  selectedLanguage,
}: {
  onChange: (language: PreferredLanguage) => void;
  selectedLanguage: PreferredLanguage;
}) {
  const copy = residentAlertUiText[selectedLanguage];

  return (
    <View style={styles.languageSelector}>
      <Text style={styles.languageLabel}>{copy.language}</Text>
      <View style={styles.languageOptions}>
        {preferredLanguages.map((language) => {
          const selected = selectedLanguage === language;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={language}
              onPress={() => onChange(language)}
              style={({ pressed }) => [
                styles.languageOption,
                selected && styles.languageOptionSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.languageOptionText, selected && styles.languageOptionTextSelected]}>
                {preferredLanguageLabels[language]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type CompactFilterOption<T extends string> = {
  helper?: string;
  label: string;
  value: T;
};

function CompactFilterDropdown<T extends string>({
  open,
  options,
  onSelect,
  onToggle,
  selectedLabel,
  selectedValue,
}: {
  open: boolean;
  options: CompactFilterOption<T>[];
  onSelect: (value: T) => void;
  onToggle: () => void;
  selectedLabel: string;
  selectedValue: T;
}) {
  return (
    <View style={[styles.filterSelectColumn, open && styles.filterSelectColumnOpen]}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [styles.filterSelectButton, open && styles.filterSelectButtonOpen, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={styles.filterSelectText}>
          {selectedLabel}
        </Text>
        <Text style={styles.filterSelectChevron}>v</Text>
      </Pressable>

      {open ? (
        <ScrollView
          contentContainerStyle={styles.filterOptionList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.filterOptionScroller}>
          {options.map((option) => {
            const selected = option.value === selectedValue;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [
                  styles.filterOptionRow,
                  selected && styles.filterOptionRowSelected,
                  pressed && styles.pressed,
                ]}>
                <Text
                  numberOfLines={1}
                  style={[styles.filterOptionText, selected && styles.filterOptionTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ResidentAlertFilters({
  disasterTypeFilter,
  disasterTypeOptions,
  locationFilter,
  locationOptions,
  onDisasterTypeFilterChange,
  onLocationFilterChange,
  onSearchQueryChange,
  residentArea,
  searchQuery,
  selectedLanguage,
}: {
  disasterTypeFilter: DisasterTypeFilterValue;
  disasterTypeOptions: string[];
  locationFilter: LocationFilterValue;
  locationOptions: string[];
  onDisasterTypeFilterChange: (filter: DisasterTypeFilterValue) => void;
  onLocationFilterChange: (filter: LocationFilterValue) => void;
  onSearchQueryChange: (query: string) => void;
  residentArea: string | null;
  searchQuery: string;
  selectedLanguage: PreferredLanguage;
}) {
  const [openFilterMenu, setOpenFilterMenu] = useState<'disaster' | 'location' | null>(null);
  const copy = residentAlertUiText[selectedLanguage];
  const selectedDisasterType = disasterTypeFromFilter(disasterTypeFilter);
  const selectedDisasterTypeLabel = selectedDisasterType
    ? translateDisasterType(selectedDisasterType, selectedLanguage)
    : copy.allDisasterTypes;
  const selectedLocation = locationFromFilter(locationFilter);
  const selectedLocationLabel = locationFilter === myAreaFilter
    ? copy.myArea
    : selectedLocation ?? copy.allLocations;
  const disasterFilterOptions = [
    {
      label: copy.allDisasterTypes,
      value: allDisasterTypesFilter,
    },
    ...disasterTypeOptions.map((disasterType) => ({
      helper: disasterType === translateDisasterType(disasterType, selectedLanguage)
        ? undefined
        : disasterType,
      label: translateDisasterType(disasterType, selectedLanguage),
      value: disasterTypeFilterFor(disasterType),
    })),
  ] satisfies CompactFilterOption<DisasterTypeFilterValue>[];
  const locationFilterOptions = [
    {
      helper: undefined,
      label: copy.allLocations,
      value: allLocationsFilter,
    },
    {
      helper: residentArea?.trim() || undefined,
      label: copy.myArea,
      value: myAreaFilter,
    },
    ...locationOptions.map((location) => ({
      helper: undefined,
      label: location,
      value: locationFilterFor(location),
    })),
  ] satisfies CompactFilterOption<LocationFilterValue>[];

  const selectDisasterTypeFilter = (value: DisasterTypeFilterValue) => {
    onDisasterTypeFilterChange(value);
    setOpenFilterMenu(null);
  };

  const selectLocationFilter = (value: LocationFilterValue) => {
    onLocationFilterChange(value);
    setOpenFilterMenu(null);
  };

  return (
    <View style={[styles.filterPanel, openFilterMenu && styles.filterPanelOpen]}>
      <View style={styles.searchField}>
        <AppIcon fallback="S" name="magnifyingglass" size={18} tintColor={colors.muted} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onSearchQueryChange}
          placeholder={copy.searchPlaceholder}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.blue}
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      <View style={styles.filterSelectRow}>
        <CompactFilterDropdown
          open={openFilterMenu === 'disaster'}
          options={disasterFilterOptions}
          selectedLabel={selectedDisasterTypeLabel}
          selectedValue={disasterTypeFilter}
          onSelect={selectDisasterTypeFilter}
          onToggle={() => setOpenFilterMenu((current) => current === 'disaster' ? null : 'disaster')}
        />
        <CompactFilterDropdown
          open={openFilterMenu === 'location'}
          options={locationFilterOptions}
          selectedLabel={selectedLocationLabel}
          selectedValue={locationFilter}
          onSelect={selectLocationFilter}
          onToggle={() => setOpenFilterMenu((current) => current === 'location' ? null : 'location')}
        />
      </View>
    </View>
  );
}

function AreaRelevanceBadge({
  displayTheme,
  label,
}: {
  displayTheme: AlertDisplayTheme;
  label: string;
}) {
  const theme = alertDisplayThemeStyles[displayTheme];

  return (
    <View
      style={[
        styles.areaMatchBadge,
        {
          backgroundColor: theme.pillBackground,
          borderColor: theme.pillBorder,
        },
      ]}>
      <AppIcon fallback="F" name="flag.fill" size={14} tintColor={theme.pillText} />
      <Text style={[styles.areaMatchBadgeText, { color: theme.pillText }]}>{label}</Text>
    </View>
  );
}

function ResidentAudienceTabs({
  onChange,
  selectedLanguage,
  selectedTab,
}: {
  onChange: (tab: ResidentAlertTab) => void;
  selectedLanguage: PreferredLanguage;
  selectedTab: ResidentAlertTab;
}) {
  const copy = residentAlertUiText[selectedLanguage];
  const tabs: { label: string; value: ResidentAlertTab }[] = [
    { label: copy.generalPublic, value: 'GENERAL_PUBLIC' },
    { label: copy.schoolEmergency, value: 'SCHOOL_EMERGENCY' },
  ];

  return (
    <View style={styles.residentTabRow}>
      {tabs.map((tab) => {
        const selected = selectedTab === tab.value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.residentTab,
              selected && styles.residentTabSelected,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.residentTabText, selected && styles.residentTabTextSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function schoolSummaryText(alert: Alert, language: PreferredLanguage) {
  if (alert.alertAudience !== 'SCHOOL_EMERGENCY' || alert.schools.length === 0) {
    return null;
  }

  if (alert.schools.length === 1) {
    return alert.schools[0].schoolName;
  }

  return `${alert.schools.length} ${residentAlertUiText[language].schoolsTargeted}`;
}

function ResidentLocationSummary({
  alert,
  language,
}: {
  alert: Alert;
  language: PreferredLanguage;
}) {
  const schoolSummary = schoolSummaryText(alert, language);

  if (!schoolSummary) {
    return <Text numberOfLines={1} style={styles.residentAreaText}>{alert.affectedArea}</Text>;
  }

  return (
    <View style={styles.residentLocationBlock}>
      <Text numberOfLines={1} style={styles.residentSchoolSummaryText}>
        {'\u{1F3EB}'} {schoolSummary}
      </Text>
      <Text numberOfLines={1} style={styles.residentAreaText}>
        {'\u{1F4CD}'} {alert.affectedArea}
      </Text>
    </View>
  );
}

function TabEmptyState({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <View style={styles.tabEmptyCard}>
      <Text style={styles.tabEmptyTitle}>{title}</Text>
      <Text style={styles.tabEmptyText}>{body}</Text>
    </View>
  );
}

function SchoolAlertsDisabledState({
  language,
  onOpenPreferences,
}: {
  language: PreferredLanguage;
  onOpenPreferences: () => void;
}) {
  const copy = residentAlertUiText[language];

  return (
    <View style={styles.schoolDisabledCard}>
      <Text style={styles.schoolDisabledTitle}>{copy.schoolAlertsDisabled}</Text>
      <Text style={styles.schoolDisabledText}>{copy.schoolAlertsDisabledBody}</Text>
      <AlertAction label={`${copy.openPreferences} ->`} onPress={onOpenPreferences} />
    </View>
  );
}

function authorityAudienceLabel(audience: AlertAudience) {
  return audience === 'SCHOOL_EMERGENCY' ? 'SCHOOL' : audience === 'GENERAL_PUBLIC' ? 'GENERAL PUBLIC' : 'ALL';
}

function authorityFlagColor(riskLevel: AlertRiskLevel) {
  if (riskLevel === 'Critical') {
    return colors.red;
  }

  if (riskLevel === 'High' || riskLevel === 'Moderate') {
    return colors.amber;
  }

  return colors.success;
}

function ResidentLoadingState({ language }: { language: PreferredLanguage }) {
  const copy = residentAlertUiText[language];

  return (
    <View style={styles.residentLoadingState}>
      <ActivityIndicator color={colors.red} size="large" />
      <Text style={styles.loadingStateText}>{copy.loadingAlerts}</Text>
    </View>
  );
}

function ResidentRiskAlertCard({
  alert,
  onViewAlert,
  selectedLanguage,
}: {
  alert: Alert;
  onViewAlert: (alertId: number, language: PreferredLanguage, alertDisplayTheme: AlertDisplayTheme) => void;
  selectedLanguage: PreferredLanguage;
}) {
  const displayTheme: AlertDisplayTheme = 'danger';
  const theme = alertDisplayThemeStyles[displayTheme];
  const copy = residentAlertUiText[selectedLanguage];

  return (
    <View
      style={[
        styles.residentAlertCard,
        styles.highRiskCard,
        { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor },
      ]}>
      {alert.alertAudience === 'SCHOOL_EMERGENCY' ? (
        <Text style={[styles.schoolContextBadge, { color: theme.titleColor }]}>
          {copy.schoolEmergencyContext}
        </Text>
      ) : null}
      <View style={styles.residentCardTopRow}>
        <View style={[styles.residentAlertIcon, { backgroundColor: theme.accent }]}>
          <AppIcon fallback="!" name="exclamationmark.triangle.fill" size={26} tintColor={colors.onPrimary} />
        </View>
        <View style={styles.residentTitleBlock}>
          <Text numberOfLines={1} style={[styles.alertTitle, { color: theme.titleColor }]}>
            {translateAlertTitle(alert, selectedLanguage)}
          </Text>
          <ResidentLocationSummary alert={alert} language={selectedLanguage} />
        </View>
        <ResidentStatusBadge language={selectedLanguage} status={alert.status} />
      </View>

      <View style={styles.relevanceRiskRow}>
        <AreaRelevanceBadge displayTheme={displayTheme} label={copy.yourArea} />
        <Text style={[styles.riskText, { color: theme.titleColor }]}>
          {copy.risk}: {translateRiskLevel(alert.riskLevel, selectedLanguage)}
        </Text>
      </View>

      <View style={styles.compactInfoRow}>
        <Text style={styles.issuedText}>{copy.issued}: {formatCompactDateTime(alert.createdAt)}</Text>
      </View>

      <View style={styles.alertActionRow}>
        <AlertAction
          label={`${copy.viewAlert} ->`}
          onPress={() => onViewAlert(alert.id, selectedLanguage, displayTheme)}
        />
      </View>
    </View>
  );
}

function ResidentWarningAlertCard({
  alert,
  onViewAlert,
  selectedLanguage,
}: {
  alert: Alert;
  onViewAlert: (alertId: number, language: PreferredLanguage, alertDisplayTheme: AlertDisplayTheme) => void;
  selectedLanguage: PreferredLanguage;
}) {
  const displayTheme: AlertDisplayTheme = 'warning';
  const theme = alertDisplayThemeStyles[displayTheme];
  const copy = residentAlertUiText[selectedLanguage];

  return (
    <View
      style={[
        styles.residentAlertCard,
        styles.warningCard,
        { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor },
      ]}>
      {alert.alertAudience === 'SCHOOL_EMERGENCY' ? (
        <Text style={[styles.schoolContextBadge, { color: theme.titleColor }]}>
          {copy.schoolEmergencyContext}
        </Text>
      ) : null}
      <View style={styles.residentCardTopRow}>
        <View style={[styles.residentAlertIcon, { backgroundColor: theme.accent }]}>
          <AppIcon fallback="!" name="exclamationmark.triangle.fill" size={26} tintColor={colors.onPrimary} />
        </View>
        <View style={styles.residentTitleBlock}>
          <Text numberOfLines={1} style={[styles.alertTitle, { color: theme.titleColor }]}>
            {translateAlertTitle(alert, selectedLanguage)}
          </Text>
          <ResidentLocationSummary alert={alert} language={selectedLanguage} />
        </View>
        <ResidentStatusBadge language={selectedLanguage} status={alert.status} />
      </View>

      <View style={styles.relevanceRiskRow}>
        <AreaRelevanceBadge displayTheme={displayTheme} label={copy.warning} />
        <Text style={[styles.riskText, { color: theme.titleColor }]}>
          {copy.risk}: {translateRiskLevel(alert.riskLevel, selectedLanguage)}
        </Text>
      </View>

      <View style={styles.compactInfoRow}>
        <Text style={styles.issuedText}>{copy.issued}: {formatCompactDateTime(alert.createdAt)}</Text>
      </View>

      <View style={styles.alertActionRow}>
        <AlertAction
          label={`${copy.viewAlert} ->`}
          onPress={() => onViewAlert(alert.id, selectedLanguage, displayTheme)}
        />
      </View>
    </View>
  );
}

function AllClearState({
  hasOtherAreaAlerts,
  language,
  residentArea,
}: {
  hasOtherAreaAlerts: boolean;
  language: PreferredLanguage;
  residentArea: string | null;
}) {
  const areaName = residentArea?.trim();
  const copy = residentAlertUiText[language];

  return (
    <View style={styles.allClearCard}>
      <Text style={styles.allClearLabel}>{copy.allClear}</Text>
      <Text style={styles.allClearTitle}>
        {hasOtherAreaAlerts ? copy.yourAreaClear : copy.noActiveAlerts}
      </Text>
      {hasOtherAreaAlerts && areaName ? (
        <Text style={styles.allClearArea}>{copy.registeredArea}: {areaName}</Text>
      ) : null}
      <Text style={styles.allClearText}>
        {hasOtherAreaAlerts
          ? copy.noResidentAreaAlert
          : copy.noActiveEmergencyAlerts}
      </Text>
    </View>
  );
}

function AuthorityHeader() {
  return (
    <View style={styles.authorityHeader}>
      <View style={styles.authorityHeaderTop}>
        <Text style={styles.title}>Authority Alert Center</Text>
        <View style={styles.authorityModeBadge}>
          <Text style={styles.authorityModeBadgeText}>AUTHORITY MODE</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Monitor and manage official emergency warnings</Text>
    </View>
  );
}

function AuthorityEmergencyActionCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.authorityEmergencyActionCard, pressed && styles.pressed]}>
      <View style={styles.authorityActionContent}>
        <View style={styles.authorityActionIcon}>
          <AppIcon fallback="!" name="exclamationmark.triangle.fill" size={22} tintColor={colors.red} />
        </View>
        <View style={styles.authorityActionTextBlock}>
          <Text style={styles.authorityActionTitle}>SEND EMERGENCY ALERT</Text>
          <Text style={styles.authorityActionBody}>
            Create and publish an official warning for affected communities.
          </Text>
        </View>
      </View>
      <View style={styles.authorityCreateButton}>
        <Text style={styles.authorityCreateButtonText}>+ Create Alert</Text>
      </View>
    </Pressable>
  );
}

function handleNestedCardAction(event: GestureResponderEvent, action: () => void) {
  event.stopPropagation();
  action();
}

function AuthorityAlertCard({
  alert,
  cancelling,
  onCancelAlert,
  onEditAlert,
  onViewAlert,
}: {
  alert: Alert;
  cancelling: boolean;
  onCancelAlert: (alert: Alert) => void;
  onEditAlert: (alertId: number) => void;
  onViewAlert: (alertId: number) => void;
}) {
  const severity = authoritySeverityTheme[alert.riskLevel];
  const flagColor = authorityFlagColor(alert.riskLevel);
  const schoolSummary = schoolSummaryText(alert, 'English');
  const metaText = [
    authorityAudienceLabel(alert.alertAudience),
    alert.riskLevel.toUpperCase(),
    schoolSummary,
  ].filter(Boolean).join(' • ');
  const messagePreview = alert.message.trim();
  const expiryText = alert.expiresAt ? formatCompactDateTime(alert.expiresAt) : null;

  return (
    <Pressable
      accessibilityLabel={`Open alert details for ${alert.title}`}
      accessibilityRole="button"
      onPress={() => onViewAlert(alert.id)}
      style={({ pressed }) => [
        styles.authorityAlertCard,
        { borderLeftColor: severity.accent },
        pressed && styles.pressed,
      ]}>
      <View style={styles.authorityAlertTopRow}>
        <View style={styles.authorityAlertTitleRow}>
          <View
            style={[
              styles.authorityAlertIcon,
              { backgroundColor: severity.badgeBackground, borderColor: flagColor },
            ]}>
            <AppIcon fallback="F" name="flag.fill" size={18} tintColor={flagColor} />
          </View>
          <Text numberOfLines={1} style={styles.authorityAlertTitle}>
            {alert.title}
          </Text>
        </View>
        <Text style={styles.authorityStatusBadge}>
          {alert.status.toUpperCase()}
        </Text>
      </View>

      <Text numberOfLines={1} style={styles.areaText}>{alert.affectedArea}</Text>

      <Text numberOfLines={1} style={styles.authorityCardMetaText}>{metaText}</Text>

      <Text numberOfLines={2} ellipsizeMode="tail" style={styles.authorityMessagePreview}>
        {messagePreview}
      </Text>

      <View style={styles.authorityCardFooter}>
        <View style={styles.authorityCardTimeBlock}>
          <Text numberOfLines={1} style={styles.compactMetaText}>
            Issued: {formatCompactDateTime(alert.createdAt)}
          </Text>
          {expiryText ? (
            <Text numberOfLines={1} style={styles.compactMetaText}>
              Expires: {expiryText}
            </Text>
          ) : null}
        </View>
        <View style={styles.authorityIconActions}>
          <Pressable
            accessibilityLabel="Edit alert"
            accessibilityRole="button"
            hitSlop={8}
            onPress={(event) => handleNestedCardAction(event, () => onEditAlert(alert.id))}
            style={({ pressed }) => [styles.authorityIconButton, pressed && styles.pressed]}>
            <AppIcon fallback="E" name="pencil.fill" size={16} tintColor={colors.red} />
          </Pressable>
          <Pressable
            accessibilityLabel="Cancel alert"
            accessibilityRole="button"
            disabled={cancelling}
            hitSlop={8}
            onPress={(event) => handleNestedCardAction(event, () => onCancelAlert(alert))}
            style={({ pressed }) => [
              styles.authorityIconButton,
              styles.authorityCancelIconButton,
              cancelling && styles.disabledAction,
              pressed && !cancelling && styles.pressed,
            ]}>
            {cancelling ? (
              <ActivityIndicator color={colors.red} size="small" />
            ) : (
              <AppIcon fallback="X" name="trash.fill" size={16} tintColor={colors.red} />
            )}
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function ResidentDashboard({
  alerts,
  errorMessage,
  loadingAlerts,
  onAlertTabChange,
  onLanguageChange,
  onOpenPreferences,
  onRetry,
  onViewAlert,
  residentArea,
  schoolAlertsEnabled,
  selectedAlertTab,
  selectedLanguage,
}: ResidentDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [disasterTypeFilter, setDisasterTypeFilter] = useState<DisasterTypeFilterValue>(allDisasterTypesFilter);
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(allLocationsFilter);
  const showInitialLoading = loadingAlerts && alerts.length === 0;
  const showError = Boolean(errorMessage) && alerts.length === 0 && !showInitialLoading;
  const showRiskIndicators = !showInitialLoading && !showError;
  const residentAreaName = residentArea?.trim() || null;
  const copy = residentAlertUiText[selectedLanguage];
  const disasterTypeOptions = useMemo(() => uniqueAlertDisasterTypes(alerts), [alerts]);
  const selectedDisasterType = disasterTypeFromFilter(disasterTypeFilter);
  const locationOptions = useMemo(() => uniqueAlertLocations(alerts), [alerts]);
  const selectedLocation = locationFromFilter(locationFilter);
  const tabAlerts = useMemo(() => alerts.filter((alert) => {
    if (selectedAlertTab === 'GENERAL_PUBLIC') {
      return alert.alertAudience === 'GENERAL_PUBLIC' || alert.alertAudience === 'ALL';
    }

    return alert.alertAudience === 'ALL' || (
      alert.alertAudience === 'SCHOOL_EMERGENCY'
      && (schoolAlertsEnabled || isCriticalAlert(alert))
    );
  }), [alerts, schoolAlertsEnabled, selectedAlertTab]);
  const filteredTabAlerts = useMemo(
    () => tabAlerts.filter((alert) => (
      alertMatchesDisasterTypeFilter(alert, disasterTypeFilter)
      && alertMatchesLocationFilter(alert, locationFilter, residentArea)
      && alertMatchesSearch(alert, searchQuery, selectedLanguage)
    )),
    [disasterTypeFilter, locationFilter, residentArea, searchQuery, selectedLanguage, tabAlerts],
  );

  useEffect(() => {
    if (
      selectedLocation
      && !locationOptions.some((location) => normalizeAlertArea(location) === normalizeAlertArea(selectedLocation))
    ) {
      setLocationFilter(allLocationsFilter);
    }
  }, [locationOptions, selectedLocation]);

  useEffect(() => {
    if (
      selectedDisasterType
      && !disasterTypeOptions.some((disasterType) => (
        searchableText(disasterType) === searchableText(selectedDisasterType)
      ))
    ) {
      setDisasterTypeFilter(allDisasterTypesFilter);
    }
  }, [disasterTypeOptions, selectedDisasterType]);

  const hasCriticalSchoolOverride = selectedAlertTab === 'SCHOOL_EMERGENCY'
    && tabAlerts.some((alert) => alert.alertAudience === 'SCHOOL_EMERGENCY' && isCriticalAlert(alert));
  const showSchoolDisabled = selectedAlertTab === 'SCHOOL_EMERGENCY'
    && !schoolAlertsEnabled
    && !hasCriticalSchoolOverride;
  const prioritizedAlerts = useMemo(
    () => [...filteredTabAlerts].sort(compareAlertsBySeverity),
    [filteredTabAlerts],
  );
  const alertGroups = prioritizedAlerts.reduce(
    (groups, alert) => {
      if (getResidentAlertDisplayTheme(alert, residentArea) === 'danger') {
        groups.residentAreaAlerts.push(alert);
      } else {
        groups.otherAreaAlerts.push(alert);
      }

      return groups;
    },
    {
      otherAreaAlerts: [] as Alert[],
      residentAreaAlerts: [] as Alert[],
    },
  );
  const { otherAreaAlerts, residentAreaAlerts } = alertGroups;
  const showTabEmptyState = showRiskIndicators && tabAlerts.length === 0 && !showSchoolDisabled;
  const showFilteredEmptyState = showRiskIndicators
    && tabAlerts.length > 0
    && filteredTabAlerts.length === 0
    && !showSchoolDisabled;

  return (
    <>
      <View style={styles.header}>
        <View style={styles.residentHeaderTopRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>{copy.emergencyAlerts}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenPreferences}
            style={({ pressed }) => [styles.preferencesButton, pressed && styles.pressed]}>
            <AppIcon fallback="P" name="slider.horizontal.3" size={16} tintColor={colors.deepBlue} />
            <Text style={styles.preferencesButtonText}>Preferences</Text>
          </Pressable>
        </View>
        <ResidentAlertFilters
          disasterTypeFilter={disasterTypeFilter}
          disasterTypeOptions={disasterTypeOptions}
          locationFilter={locationFilter}
          locationOptions={locationOptions}
          onDisasterTypeFilterChange={setDisasterTypeFilter}
          onLocationFilterChange={setLocationFilter}
          onSearchQueryChange={setSearchQuery}
          residentArea={residentAreaName}
          searchQuery={searchQuery}
          selectedLanguage={selectedLanguage}
        />
        <ResidentLanguageSelector selectedLanguage={selectedLanguage} onChange={onLanguageChange} />
        <ResidentAudienceTabs
          onChange={onAlertTabChange}
          selectedLanguage={selectedLanguage}
          selectedTab={selectedAlertTab}
        />
      </View>

      {errorMessage && alerts.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{copy.unableLoadAlerts}</Text>
          <AlertAction label={copy.retry} onPress={onRetry} />
        </View>
      ) : null}

      {showInitialLoading ? <ResidentLoadingState language={selectedLanguage} /> : null}

      {showError ? (
        <EmptyState
          body={copy.checkConnection}
          title={copy.unableLoadAlerts}
          action={<PrimaryButton title={copy.retry} onPress={onRetry} />}
        />
      ) : null}

      {showRiskIndicators && showSchoolDisabled ? (
        <SchoolAlertsDisabledState language={selectedLanguage} onOpenPreferences={onOpenPreferences} />
      ) : null}

      {showTabEmptyState ? (
        <TabEmptyState
          body={selectedAlertTab === 'GENERAL_PUBLIC'
            ? copy.noGeneralPublicAlertsBody
            : copy.noSchoolEmergencyAlertsBody}
          title={selectedAlertTab === 'GENERAL_PUBLIC'
            ? copy.noGeneralPublicAlerts
            : copy.noSchoolEmergencyAlerts}
        />
      ) : null}

      {showFilteredEmptyState ? (
        <TabEmptyState
          body={copy.noFilteredAlertsBody}
          title={copy.noFilteredAlerts}
        />
      ) : null}

      {showRiskIndicators && residentAreaAlerts.length > 0 ? (
        <View style={styles.alertList}>
          {residentAreaAlerts.map((alert) => (
            <ResidentRiskAlertCard
              alert={alert}
              key={alert.id}
              onViewAlert={onViewAlert}
              selectedLanguage={selectedLanguage}
            />
          ))}
        </View>
      ) : null}

      {showRiskIndicators && filteredTabAlerts.length > 0 && residentAreaAlerts.length === 0 ? (
        <AllClearState
          hasOtherAreaAlerts={otherAreaAlerts.length > 0}
          language={selectedLanguage}
          residentArea={residentAreaName}
        />
      ) : null}

      {showRiskIndicators && otherAreaAlerts.length > 0 ? (
        <View style={styles.alertList}>
          {otherAreaAlerts.map((alert) => (
            <ResidentWarningAlertCard
              alert={alert}
              key={alert.id}
              onViewAlert={onViewAlert}
              selectedLanguage={selectedLanguage}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function AuthorityDashboard({
  alerts,
  cancellingAlertId,
  errorMessage,
  loadingAlerts,
  noticeMessage,
  onCancelAlert,
  onCreateAlert,
  onEditAlert,
  onRetry,
  onViewHistory,
  onViewAlert,
}: DashboardStateProps & {
  cancellingAlertId: number | null;
  noticeMessage: string | null;
  onCancelAlert: (alert: Alert) => void;
  onCreateAlert: () => void;
  onEditAlert: (alertId: number) => void;
  onViewHistory: () => void;
}) {
  const showInitialLoading = loadingAlerts && alerts.length === 0;
  const showError = Boolean(errorMessage) && alerts.length === 0 && !showInitialLoading;
  const showEmpty = !showInitialLoading && !showError && alerts.length === 0;
  const sortedAlerts = [...alerts].sort(compareAlertsBySeverity);

  return (
    <>
      <AuthorityHeader />
      <AuthorityEmergencyActionCard onPress={onCreateAlert} />

      {errorMessage && alerts.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {noticeMessage ? (
        <View style={styles.inlineSuccess}>
          <Text style={styles.inlineSuccessText}>{noticeMessage}</Text>
        </View>
      ) : null}

      <View style={styles.authoritySectionHeader}>
        <View style={styles.authoritySectionTitleBlock}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          <Text style={styles.authoritySectionSubtitle}>Official warnings currently published</Text>
        </View>
        <View style={styles.authoritySectionActions}>
          <View style={styles.activeCountBadge}>
            <Text style={styles.activeCountBadgeText}>{alerts.length} ACTIVE</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onViewHistory}
            style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
            <Text style={styles.historyLinkText}>View Alert History</Text>
          </Pressable>
        </View>
      </View>

      {showInitialLoading ? <LoadingState message="Checking verified alerts..." /> : null}

      {showError ? (
        <EmptyState
          body="Check your connection and try again."
          title="Unable to load emergency alerts"
          action={<PrimaryButton title="Retry" onPress={onRetry} />}
        />
      ) : null}

      {showEmpty ? (
        <EmptyState
          body="There are currently no published emergency warnings."
          title="No Active Alerts"
          action={<PrimaryButton title="Create Alert" tone="red" onPress={onCreateAlert} />}
        />
      ) : null}

      {!showInitialLoading && !showError && alerts.length > 0 ? (
        <View style={styles.compactAlertList}>
          {sortedAlerts.map((alert) => (
            <AuthorityAlertCard
              alert={alert}
              cancelling={cancellingAlertId === alert.id}
              key={alert.id}
              onCancelAlert={onCancelAlert}
              onEditAlert={onEditAlert}
              onViewAlert={onViewAlert}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function CancelAlertDialog({
  alert,
  cancelling,
  onCancel,
  onConfirm,
}: {
  alert: Alert | null;
  cancelling: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={Boolean(alert)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.cancelDialog}>
          <Text style={styles.cancelDialogEyebrow}>Authority Action</Text>
          <Text style={styles.cancelDialogTitle}>Cancel Emergency Alert</Text>
          <Text style={styles.cancelDialogText}>
            This alert will no longer be shown as active to residents, active alert counts, or current area risk
            checks.
          </Text>

          {alert ? (
            <View style={styles.cancelDialogContext}>
              <Text style={styles.cancelDialogContextLabel}>Selected Alert</Text>
              <Text style={styles.cancelDialogAlertTitle}>{alert.title}</Text>
              <Text style={styles.cancelDialogMeta}>Alert #{alert.id}</Text>
              <Text style={styles.cancelDialogMeta}>Affected Area: {alert.affectedArea}</Text>
              <Text style={styles.cancelDialogMeta}>Risk Level: {alert.riskLevel}</Text>
              <Text style={styles.cancelDialogMeta}>Issued: {formatDateTime(alert.createdAt)}</Text>
            </View>
          ) : null}

          <View style={styles.cancelDialogActions}>
            <Pressable
              accessibilityRole="button"
              disabled={cancelling}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.keepAlertButton,
                cancelling && styles.disabledAction,
                pressed && !cancelling && styles.pressed,
              ]}>
              <Text style={styles.keepAlertButtonText}>Keep Alert</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={cancelling}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmCancelButton,
                cancelling && styles.disabledAction,
                pressed && !cancelling && styles.pressed,
              ]}>
              <Text style={styles.confirmCancelButtonText}>
                {cancelling ? 'Cancelling...' : 'Cancel Alert'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Alert | null>(null);
  const [cancellingAlertId, setCancellingAlertId] = useState<number | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [residentPreferences, setResidentPreferences] = useState<AlertPreferences | null>(null);
  const [savedPreferredLanguage, setSavedPreferredLanguage] = useState<PreferredLanguage | null>(null);
  const [loadingPreferredLanguage, setLoadingPreferredLanguage] = useState(true);
  const [selectedAlertTab, setSelectedAlertTab] = useState<ResidentAlertTab>('GENERAL_PUBLIC');
  const [selectedLanguage, setSelectedLanguage] = useState<PreferredLanguage | null>(null);
  const routeLanguage = preferredLanguageOrNull(firstParam(params.language));
  const userPreferredLanguageValue = user?.preferredLanguage;
  const userRole = user?.role;

  useFocusEffect(
    useCallback(() => {
      if (!token || !userRole || isAuthorityRole(userRole)) {
        setLoadingPreferredLanguage(false);
        return undefined;
      }

      let isActive = true;
      const fallbackLanguage = toPreferredLanguage(userPreferredLanguageValue);

      if (routeLanguage) {
        setSelectedLanguage(routeLanguage);
        setLoadingPreferredLanguage(false);
      } else {
        setSelectedLanguage(null);
        setLoadingPreferredLanguage(true);
      }

      void getAlertPreferences(token)
        .then((preferences) => {
          if (!isActive) {
            return;
          }

          setResidentPreferences(preferences);
          setSavedPreferredLanguage(toPreferredLanguage(preferences.preferredLanguage, fallbackLanguage));
        })
        .catch((error) => {
          if (__DEV__ && !isAlertApiError(error)) {
            console.warn('Unexpected alert preference language error:', error);
          }

          if (isActive) {
            setResidentPreferences(null);
            setSavedPreferredLanguage(fallbackLanguage);
          }
        })
        .finally(() => {
          if (isActive) {
            setLoadingPreferredLanguage(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [routeLanguage, token, userPreferredLanguageValue, userRole]),
  );

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
    setNoticeMessage(null);

    try {
      setAlerts(await getActiveAlerts(token));
    } catch {
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

  const handleCreateAlert = useCallback(() => {
    router.push('/alerts/create' as Href);
  }, [router]);

  const handleViewAlert = useCallback((
    alertId: number,
    language?: PreferredLanguage,
    alertDisplayTheme?: AlertDisplayTheme,
  ) => {
    router.push({
      pathname: '/alerts/[id]',
      params: {
        id: String(alertId),
        ...(language ? { language } : {}),
        ...(alertDisplayTheme ? { alertDisplayTheme } : {}),
      },
    } as unknown as Href);
  }, [router]);

  const handleEditAlert = useCallback((alertId: number) => {
    router.push({
      pathname: '/alerts/[id]/edit',
      params: { id: String(alertId) },
    } as unknown as Href);
  }, [router]);

  const handleViewHistory = useCallback(() => {
    router.push('/alerts/history' as Href);
  }, [router]);

  const handleOpenPreferences = useCallback(() => {
    router.push('/alerts/preferences' as Href);
  }, [router]);

  const handleCancelAlertRequest = useCallback((alert: Alert) => {
    if (alert.status !== 'Active') {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setCancelTarget(alert);
  }, []);

  const handleKeepAlert = useCallback(() => {
    if (cancellingAlertId === null) {
      setCancelTarget(null);
    }
  }, [cancellingAlertId]);

  const handleConfirmCancelAlert = useCallback(async () => {
    if (!token || !cancelTarget || cancellingAlertId !== null) {
      return;
    }

    setCancellingAlertId(cancelTarget.id);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const cancelledAlert = await updateAlert(String(cancelTarget.id), {
        title: cancelTarget.title,
        disasterType: cancelTarget.disasterType,
        affectedArea: cancelTarget.affectedArea,
        alertAudience: cancelTarget.alertAudience,
        riskLevel: cancelTarget.riskLevel,
        status: 'Cancelled',
        auditAction: 'CANCELLED',
        message: cancelTarget.message,
        safetyInstructions: cancelTarget.safetyInstructions,
        expiresAt: cancelTarget.expiresAt,
        schoolIds: cancelTarget.schools.map((school) => school.id),
        schools: cancelTarget.schools.map((school) => ({
          id: school.id,
          schoolName: school.schoolName,
          area: school.area,
          latitude: school.latitude,
          longitude: school.longitude,
          osmId: school.osmId,
          osmType: school.osmType,
          formattedAddress: school.formattedAddress,
        })),
      }, token);

      setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== cancelledAlert.id));
      setCancelTarget(null);
      setNoticeMessage('Emergency alert cancelled successfully.');
    } catch (error) {
      if (__DEV__ && !isAlertApiError(error)) {
        console.warn('Unexpected alert cancellation error:', error);
      }

      setErrorMessage(
        isAlertApiError(error) && error.statusCode === 403
          ? 'You are not authorized to cancel emergency alerts.'
          : 'Unable to cancel this emergency alert. Check your connection and try again.',
      );
    } finally {
      setCancellingAlertId(null);
    }
  }, [cancelTarget, cancellingAlertId, token]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user || !user.role) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="Loading alert center..." />
      </SafeAreaView>
    );
  }

  const userPreferredLanguage = toPreferredLanguage(user.preferredLanguage);
  const activeLanguage = selectedLanguage ?? routeLanguage ?? savedPreferredLanguage ?? userPreferredLanguage;
  const residentLoadingAlerts = loadingAlerts || (!isAuthorityRole(user.role) && loadingPreferredLanguage && !routeLanguage);
  const schoolAlertsEnabled = residentPreferences?.schoolAlerts ?? true;
  const dashboardProps: DashboardStateProps = {
    alerts,
    errorMessage,
    loadingAlerts: isAuthorityRole(user.role) ? loadingAlerts : residentLoadingAlerts,
    onRetry: () => void loadAlerts(),
    onViewAlert: handleViewAlert,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => void loadAlerts(true)} />
        }
        showsVerticalScrollIndicator={false}>
        {isAuthorityRole(user.role) ? (
          <AuthorityDashboard
            {...dashboardProps}
            cancellingAlertId={cancellingAlertId}
            noticeMessage={noticeMessage}
            onCancelAlert={handleCancelAlertRequest}
            onCreateAlert={handleCreateAlert}
            onEditAlert={handleEditAlert}
            onViewHistory={handleViewHistory}
          />
        ) : (
          <ResidentDashboard
            {...dashboardProps}
            onAlertTabChange={setSelectedAlertTab}
            onLanguageChange={setSelectedLanguage}
            onOpenPreferences={handleOpenPreferences}
            residentArea={user.location}
            schoolAlertsEnabled={schoolAlertsEnabled}
            selectedAlertTab={selectedAlertTab}
            selectedLanguage={activeLanguage}
          />
        )}
      </ScrollView>
      <BottomNavigation />
      <CancelAlertDialog
        alert={cancelTarget}
        cancelling={cancellingAlertId !== null}
        onCancel={handleKeepAlert}
        onConfirm={handleConfirmCancelAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: 96,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    gap: spacing.sm,
    overflow: 'visible',
    position: 'relative',
    zIndex: 10,
  },
  residentHeaderTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  headerTextBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    ...typography.title,
  },
  subtitle: {
    color: colors.muted,
    ...typography.body,
  },
  alertList: {
    gap: spacing.sm,
  },
  compactAlertList: {
    gap: 6,
  },
  residentAlertCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  residentLoadingState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 132,
    padding: spacing.lg,
    ...shadows.card,
  },
  loadingStateText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  highRiskCard: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.amber,
  },
  residentCardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  residentAlertIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  residentTitleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  residentStatusBadge: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  residentStatusBadgeText: {
    color: colors.deepBlue,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  residentTabRow: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  residentTab: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.xs,
  },
  residentTabSelected: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.primaryAction,
  },
  residentTabText: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  residentTabTextSelected: {
    color: colors.onPrimary,
  },
  schoolContextBadge: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  languageSelector: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  languageLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  languageOption: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: '30%',
    paddingHorizontal: spacing.sm,
  },
  languageOptionSelected: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.primaryAction,
  },
  languageOptionText: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  languageOptionTextSelected: {
    color: colors.onPrimary,
  },
  filterPanel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'visible',
    padding: spacing.sm,
    position: 'relative',
    zIndex: 20,
    ...shadows.card,
  },
  filterPanelOpen: {
    zIndex: 200,
  },
  searchField: {
    alignItems: 'center',
    backgroundColor: colors.controlSurfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 40,
    minWidth: 0,
    paddingVertical: 0,
  },
  filterSelectRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'visible',
    position: 'relative',
    zIndex: 210,
  },
  filterSelectColumn: {
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
    position: 'relative',
    zIndex: 1,
  },
  filterSelectColumnOpen: {
    zIndex: 220,
  },
  filterSelectButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.primaryAction,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  filterSelectButtonOpen: {
    backgroundColor: colors.white,
    borderColor: colors.primaryAction,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  filterSelectText: {
    color: colors.navy,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    minWidth: 0,
  },
  filterSelectChevron: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  filterOptionScroller: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    borderColor: colors.primaryAction,
    borderWidth: 1,
    borderTopWidth: 0,
    left: 0,
    maxHeight: 260,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 38,
    zIndex: 230,
  },
  filterOptionList: {
    paddingVertical: 2,
  },
  filterOptionRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterOptionRowSelected: {
    backgroundColor: colors.blue,
  },
  filterOptionText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    minWidth: 0,
  },
  filterOptionTextSelected: {
    color: colors.onPrimary,
  },
  preferencesButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  preferencesButtonText: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  allClearCard: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  allClearLabel: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  allClearTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  allClearArea: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  allClearText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  tabEmptyCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    ...shadows.card,
  },
  tabEmptyTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  tabEmptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  schoolDisabledCard: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  schoolDisabledTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  schoolDisabledText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  authorityHeader: {
    gap: spacing.xs,
  },
  authorityHeaderTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  authorityModeBadge: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.accentAction,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  authorityModeBadgeText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  authorityEmergencyActionCard: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
    borderLeftColor: colors.redBorder,
    borderLeftWidth: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.card,
  },
  authorityActionContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  authorityActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  authorityActionTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  authorityActionTitle: {
    color: colors.red,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  authorityActionBody: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  authorityCreateButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.redAction,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 148,
    paddingHorizontal: spacing.lg,
  },
  authorityCreateButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  authorityAlertCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  authorityAlertTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  authorityAlertTitleRow: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  authorityAlertIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  authorityStatusBadge: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: 'center',
  },
  authorityCardMetaText: {
    color: colors.deepBlue,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
    marginLeft: 36,
  },
  authorityMessagePreview: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 1,
  },
  authorityCardFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  authorityCardTimeBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  authorityIconActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  authorityIconButton: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    width: 34,
  },
  authorityCancelIconButton: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  alertTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  authorityAlertTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  statusText: {
    color: colors.deepBlue,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  areaText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    marginLeft: 36,
  },
  residentLocationBlock: {
    gap: 1,
  },
  residentSchoolSummaryText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  residentAreaText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  compactInfoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  relevanceRiskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  areaMatchBadge: {
    alignItems: 'center',
    borderRadius: radius.xs,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 26,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  areaMatchBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 12,
  },
  riskText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  issuedText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  alertAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 28,
    paddingRight: spacing.sm,
  },
  alertActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  alertActionText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  sectionHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.navy,
    ...typography.sectionTitle,
  },
  authoritySectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  authoritySectionTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  authoritySectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  authoritySectionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  historyLink: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  historyLinkText: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  activeCountBadge: {
    backgroundColor: colors.primaryAction,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeCountBadgeText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  compactMetaText: {
    color: colors.muted,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    minWidth: 0,
  },
  inlineError: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  inlineErrorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  inlineSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  inlineSuccessText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: colors.backdrop,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cancelDialog: {
    backgroundColor: colors.white,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderTopColor: colors.redBorder,
    borderTopWidth: 5,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
    ...shadows.card,
  },
  cancelDialogEyebrow: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  cancelDialogTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  cancelDialogText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  cancelDialogContext: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cancelDialogContextLabel: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  cancelDialogAlertTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  cancelDialogMeta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  cancelDialogActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  keepAlertButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.primaryAction,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: '42%',
    paddingHorizontal: spacing.md,
  },
  keepAlertButtonText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  confirmCancelButton: {
    alignItems: 'center',
    backgroundColor: colors.redAction,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: '42%',
    paddingHorizontal: spacing.md,
  },
  confirmCancelButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  disabledAction: {
    opacity: 0.58,
  },
  pressed: {
    opacity: 0.72,
  },
});
