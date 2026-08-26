import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AppHeader,
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  ToggleRow,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  getAlertPreferences,
  updateAlertPreferences,
} from '@/services/alertService';
import type { UpdateAlertPreferencesPayload } from '@/types/alertPreference';
import type { PreferredLanguage } from '@/types/auth';
import { isAuthorityRole } from '@/utils/format';
import {
  preferredLanguageLabels,
  preferredLanguages,
  toPreferredLanguage,
} from '@/utils/language';

type PreferenceToggleKey =
  | 'generalNotifications'
  | 'locationAlerts'
  | 'pushNotifications'
  | 'quietHoursEnabled'
  | 'schoolAlerts'
  | 'soundEnabled'
  | 'vibrationEnabled';

const supportedAlertSounds = [
  {
    label: 'Default',
    value: 'default',
  },
] as const;

function preferenceDefaults(language: PreferredLanguage): UpdateAlertPreferencesPayload {
  return {
    alertSound: 'default',
    generalNotifications: true,
    locationAlerts: true,
    preferredLanguage: language,
    pushNotifications: true,
    quietHoursEnabled: false,
    quietHoursEnd: '06:00',
    quietHoursStart: '22:00',
    schoolAlerts: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };
}

function toPreferencePayload(preferences: UpdateAlertPreferencesPayload): UpdateAlertPreferencesPayload {
  return {
    alertSound: preferences.alertSound || 'default',
    generalNotifications: preferences.generalNotifications,
    locationAlerts: preferences.locationAlerts,
    preferredLanguage: preferences.preferredLanguage,
    pushNotifications: preferences.pushNotifications,
    quietHoursEnabled: preferences.quietHoursEnabled,
    quietHoursEnd: preferences.quietHoursEnd || '06:00',
    quietHoursStart: preferences.quietHoursStart || '22:00',
    schoolAlerts: preferences.schoolAlerts,
    soundEnabled: preferences.soundEnabled,
    vibrationEnabled: preferences.vibrationEnabled,
  };
}

function LanguageSelector({
  onChange,
  value,
}: {
  onChange: (language: PreferredLanguage) => void;
  value: PreferredLanguage;
}) {
  return (
    <View style={styles.languageOptions}>
      {preferredLanguages.map((language) => {
        const selected = value === language;

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
  );
}

function SoundSelector({
  value,
}: {
  value: string;
}) {
  const selectedSound = supportedAlertSounds.find((sound) => sound.value === value) ?? supportedAlertSounds[0];

  return (
    <View style={styles.preferenceField}>
      <View style={styles.preferenceFieldText}>
        <Text style={styles.preferenceFieldLabel}>Alert Sound Type</Text>
        <Text style={styles.preferenceFieldHint}>Only built-in default sound is available in the current project.</Text>
      </View>
      <View style={styles.soundPill}>
        <Text style={styles.soundPillText}>{selectedSound.label}</Text>
      </View>
    </View>
  );
}

function TimeField({
  label,
  onChangeText,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        onChangeText={onChangeText}
        placeholder="HH:mm"
        placeholderTextColor={colors.muted}
        style={styles.timeInput}
        value={value}
      />
    </View>
  );
}

export default function AlertPreferencesScreen() {
  const router = useRouter();
  const { isLoading, token, updateUser, user } = useAuth();
  const [preferences, setPreferences] = useState<UpdateAlertPreferencesPayload | null>(null);
  const [savedLanguage, setSavedLanguage] = useState<PreferredLanguage | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const userRole = user?.role;

  const navigateBack = useCallback(() => {
    const language = savedLanguage ?? toPreferredLanguage(user?.preferredLanguage);

    router.replace({
      pathname: '/alerts',
      params: { language },
    } as unknown as Href);
  }, [router, savedLanguage, user?.preferredLanguage]);

  const loadPreferences = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingPreferences(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const loadedPreferences = await getAlertPreferences(token);

      setPreferences(toPreferencePayload(loadedPreferences));
      setSavedLanguage(loadedPreferences.preferredLanguage);
    } catch {
      setErrorMessage('Unable to load alert preferences.');
    } finally {
      setLoadingPreferences(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && userRole && !isAuthorityRole(userRole)) {
      void loadPreferences();
    }
  }, [loadPreferences, token, userRole]);

  const togglePreference = useCallback((key: PreferenceToggleKey) => {
    setPreferences((current) => {
      const nextPreferences = current ?? preferenceDefaults(toPreferredLanguage(user?.preferredLanguage));

      return {
        ...nextPreferences,
        [key]: !nextPreferences[key],
      };
    });
    setSuccessMessage(null);
  }, [user?.preferredLanguage]);

  const updateLanguage = useCallback((language: PreferredLanguage) => {
    setPreferences((current) => ({
      ...(current ?? preferenceDefaults(toPreferredLanguage(user?.preferredLanguage))),
      preferredLanguage: language,
    }));
    setSuccessMessage(null);
  }, [user?.preferredLanguage]);

  const updateQuietHoursTime = useCallback((
    key: 'quietHoursEnd' | 'quietHoursStart',
    value: string,
  ) => {
    setPreferences((current) => ({
      ...(current ?? preferenceDefaults(toPreferredLanguage(user?.preferredLanguage))),
      [key]: value,
    }));
    setSuccessMessage(null);
  }, [user?.preferredLanguage]);

  const savePreferences = useCallback(async () => {
    if (!token || !preferences || savingPreferences) {
      return;
    }

    setSavingPreferences(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const savedPreferences = await updateAlertPreferences(toPreferencePayload(preferences), token);

      setPreferences(toPreferencePayload(savedPreferences));
      setSavedLanguage(savedPreferences.preferredLanguage);
      await updateUser({ preferredLanguage: savedPreferences.preferredLanguage });
      router.replace({
        pathname: '/alerts',
        params: { language: savedPreferences.preferredLanguage },
      } as unknown as Href);
    } catch {
      setErrorMessage('Unable to save preferences. Please try again.');
    } finally {
      setSavingPreferences(false);
    }
  }, [preferences, router, savingPreferences, token, updateUser]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!isLoading && user && isAuthorityRole(user.role)) {
    return <Redirect href={'/alerts' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading preferences..." />
      </ScreenContainer>
    );
  }

  if (loadingPreferences) {
    return (
      <ScreenContainer>
        <AppHeader
          onBack={navigateBack}
          title="Alert Preferences"
          subtitle="Choose which alerts you want to receive"
        />
        <LoadingState message="Loading preferences..." />
      </ScreenContainer>
    );
  }

  if (errorMessage && !preferences) {
    return (
      <ScreenContainer>
        <AppHeader
          onBack={navigateBack}
          title="Alert Preferences"
          subtitle="Choose which alerts you want to receive"
        />
        <EmptyState
          title="Unable to load alert preferences."
          body="Check your connection and try again."
          action={<PrimaryButton title="Retry" onPress={() => void loadPreferences()} />}
        />
      </ScreenContainer>
    );
  }

  const currentPreferences = preferences ?? preferenceDefaults(toPreferredLanguage(user.preferredLanguage));

  return (
    <ScreenContainer>
      <AppHeader
        onBack={navigateBack}
        title="Alert Preferences"
        subtitle="Choose which alerts you want to receive"
      />

      {successMessage ? (
        <View style={styles.successMessage}>
          <Text style={styles.successMessageText}>{successMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      ) : null}

      <SectionCard title="Notifications">
        <ToggleRow
          title="General Notifications"
          subtitle="Receive general emergency and community alerts."
          value={currentPreferences.generalNotifications}
          onToggle={() => togglePreference('generalNotifications')}
        />
        <ToggleRow
          title="Push Notifications"
          subtitle="Allow normal optional alert push notifications where supported."
          value={currentPreferences.pushNotifications}
          onToggle={() => togglePreference('pushNotifications')}
        />
        <ToggleRow
          title="Location-Based Alerts"
          subtitle="Receive alerts relevant to your registered/current area."
          value={currentPreferences.locationAlerts}
          onToggle={() => togglePreference('locationAlerts')}
        />
        <ToggleRow
          title="School Alerts"
          subtitle="Receive emergency alerts related to schools and school communities."
          value={currentPreferences.schoolAlerts}
          onToggle={() => togglePreference('schoolAlerts')}
        />
      </SectionCard>

      <SectionCard title="Sound & Vibration">
        <ToggleRow
          title="Alert Sound"
          subtitle="Allow normal alert notifications to use sound where supported."
          value={currentPreferences.soundEnabled}
          onToggle={() => togglePreference('soundEnabled')}
        />
        <SoundSelector value={currentPreferences.alertSound} />
        <ToggleRow
          title="Vibration"
          subtitle="Allow mobile alert vibration where supported."
          value={currentPreferences.vibrationEnabled}
          onToggle={() => togglePreference('vibrationEnabled')}
        />
      </SectionCard>

      <SectionCard title="Quiet Hours">
        <ToggleRow
          title="Quiet Hours"
          subtitle="Reduce normal optional alert noise during your configured hours."
          value={currentPreferences.quietHoursEnabled}
          onToggle={() => togglePreference('quietHoursEnabled')}
        />
        {currentPreferences.quietHoursEnabled ? (
          <View style={styles.timeFields}>
            <TimeField
              label="Start Time"
              value={currentPreferences.quietHoursStart}
              onChangeText={(value) => updateQuietHoursTime('quietHoursStart', value)}
            />
            <TimeField
              label="End Time"
              value={currentPreferences.quietHoursEnd}
              onChangeText={(value) => updateQuietHoursTime('quietHoursEnd', value)}
            />
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Critical Emergency Alerts">
        <ToggleRow
          locked
          title="Critical Emergency Alerts"
          subtitle="Critical warnings may override normal notification preferences for safety."
          value
        />
      </SectionCard>

      <SectionCard
        title="Language"
        subtitle="Preferred Alert Language">
        <LanguageSelector
          value={currentPreferences.preferredLanguage}
          onChange={updateLanguage}
        />
      </SectionCard>

      <PrimaryButton
        loading={savingPreferences}
        onPress={() => void savePreferences()}
        title="Save Preferences"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorMessage: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorMessageText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  languageOption: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: '30%',
    paddingHorizontal: spacing.sm,
  },
  languageOptionSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  languageOptionText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  languageOptionTextSelected: {
    color: colors.white,
  },
  preferenceField: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 58,
    paddingVertical: spacing.md,
  },
  preferenceFieldText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  preferenceFieldLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  preferenceFieldHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
  soundPill: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 96,
    paddingHorizontal: spacing.md,
  },
  soundPillText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  successMessage: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  successMessageText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  timeFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeField: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: '46%',
    padding: spacing.sm,
  },
  timeInput: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    minHeight: 34,
    padding: 0,
  },
  timeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
});
