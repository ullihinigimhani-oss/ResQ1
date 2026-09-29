import Constants from 'expo-constants';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  AppIcon,
  AppHeader,
  InfoRow,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  ToggleRow,
} from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';
import { colors, radius, spacing } from '@/constants/design';
import { useAppTheme, type AppTheme } from '@/context/theme-context';
import {
  defaultPrivacyPreferences,
  getPrivacyPreferences,
  savePrivacyPreferences,
  type PrivacyPreferenceKey,
  type PrivacyPreferences,
} from '@/services/privacyPreferenceService';
import { isAuthorityRole } from '@/utils/format';

const themeOptions: { icon: string; label: string; value: AppTheme }[] = [
  { icon: 'sun.max.fill', label: 'Light', value: 'light' },
  { icon: 'moon.fill', label: 'Dark', value: 'dark' },
];

const privacyOptions: {
  description: string;
  fallback: string;
  icon: string;
  key: PrivacyPreferenceKey;
  title: string;
}[] = [
  {
    description: 'Allow ResQ1 to use your location during emergencies to provide relevant alerts and assistance.',
    fallback: 'L',
    icon: 'location.fill',
    key: 'shareLocationDuringEmergencies',
    title: 'Share Location During Emergencies',
  },
  {
    description: 'Allow authorized emergency responders to access your registered emergency contact information when needed.',
    fallback: 'E',
    icon: 'person.crop.circle.fill',
    key: 'emergencyContactAccess',
    title: 'Emergency Contact Access',
  },
  {
    description: 'Share anonymous app usage and diagnostic data to help improve ResQ1.',
    fallback: 'A',
    icon: 'slider.horizontal.3',
    key: 'anonymousUsageData',
    title: 'Anonymous Usage Data',
  },
];

function PrivacySettingRow({
  description,
  disabled,
  fallback,
  icon,
  last,
  onValueChange,
  title,
  value,
}: {
  description: string;
  disabled: boolean;
  fallback: string;
  icon: string;
  last: boolean;
  onValueChange: (value: boolean) => void;
  title: string;
  value: boolean;
}) {
  return (
    <View style={[styles.privacySettingRow, !last && styles.privacySettingDivider]}>
      <View style={styles.privacyIcon}>
        <AppIcon fallback={fallback} name={icon} size={20} tintColor={colors.deepBlue} />
      </View>
      <View style={styles.privacySettingCopy}>
        <Text style={styles.privacySettingTitle}>{title}</Text>
        <Text style={styles.privacySettingDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        ios_backgroundColor={colors.switchTrack}
        onValueChange={onValueChange}
        thumbColor={value ? colors.onPrimary : colors.switchThumb}
        trackColor={{ false: colors.switchTrack, true: colors.successBorder }}
        value={value}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isLoading, signOut, user } = useAuth();
  const { setTheme, theme } = useAppTheme();
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>({
    ...defaultPrivacyPreferences,
  });
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    void getPrivacyPreferences(user.id)
      .then((preferences) => {
        if (active) {
          setPrivacyPreferences(preferences);
          setPrivacyError(null);
        }
      })
      .catch(() => {
        if (active) {
          setPrivacyPreferences({ ...defaultPrivacyPreferences });
          setPrivacyError('Unable to load privacy settings from this device.');
        }
      })
      .finally(() => {
        if (active) {
          setPrivacyLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading settings..." />
      </ScreenContainer>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/welcome' as Href);
  };

  const handlePrivacyChange = async (key: PrivacyPreferenceKey, value: boolean) => {
    if (privacySaving) {
      return;
    }

    const previousPreferences = privacyPreferences;
    const nextPreferences = { ...privacyPreferences, [key]: value };

    setPrivacyPreferences(nextPreferences);
    setPrivacySaving(true);
    setPrivacyError(null);

    try {
      await savePrivacyPreferences(user.id, nextPreferences);
    } catch {
      setPrivacyPreferences(previousPreferences);
      setPrivacyError('Unable to save this privacy setting on this device.');
    } finally {
      setPrivacySaving(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow={isAuthorityRole(user.role) ? 'Authority Preferences' : 'Resident Preferences'}
        title="Settings"
        subtitle="Manage your ResQ1 experience, privacy, and account preferences."
      />

      <SectionCard title="Appearance">
        <View style={styles.appearanceCopy}>
          <Text style={styles.appearanceTitle}>Theme</Text>
          <Text style={styles.appearanceDescription}>Choose how ResQ1 appears on your device.</Text>
        </View>
        <View accessibilityRole="radiogroup" style={styles.themeSelector}>
          {themeOptions.map((option) => {
            const selected = option.value === theme;

            return (
              <Pressable
                accessibilityLabel={`${option.label} theme`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.value}
                onPress={() => setTheme(option.value)}
                style={({ pressed }) => [
                  styles.themeOption,
                  selected && styles.themeOptionSelected,
                  pressed && styles.themeOptionPressed,
                ]}>
                <AppIcon
                  fallback={option.label.charAt(0)}
                  name={option.icon}
                  size={20}
                  tintColor={selected ? colors.blue : colors.muted}
                />
                <Text style={[styles.themeOptionLabel, selected && styles.themeOptionLabelSelected]}>
                  {option.label}
                </Text>
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Language">
        <InfoRow label="Preferred Language" value={user.preferredLanguage} />
      </SectionCard>

      <SectionCard title="Accessibility">
        <ToggleRow locked title="High Contrast Alerts" subtitle="Prepared for a future accessibility profile." value={false} />
        <ToggleRow locked title="Large Touch Targets" subtitle="ResQ1 controls already use mobile-safe target sizes." value />
      </SectionCard>

      <SectionCard title="Notifications">
        <PrimaryButton title="Alert Preferences" onPress={() => router.push('/alerts/preferences' as Href)} />
      </SectionCard>

      <SectionCard title="Privacy">
        {privacyLoading ? (
          <View style={styles.privacyLoadingState}>
            <ActivityIndicator color={colors.deepBlue} size="small" />
            <Text style={styles.privacyLoadingText}>Loading privacy settings...</Text>
          </View>
        ) : (
          <View style={styles.privacySettingsList}>
            {privacyOptions.map((option, index) => (
              <PrivacySettingRow
                description={option.description}
                disabled={privacySaving}
                fallback={option.fallback}
                icon={option.icon}
                key={option.key}
                last={index === privacyOptions.length - 1}
                onValueChange={(value) => void handlePrivacyChange(option.key, value)}
                title={option.title}
                value={privacyPreferences[option.key]}
              />
            ))}
          </View>
        )}
        {privacyError ? <Text style={styles.privacyError}>{privacyError}</Text> : null}
      </SectionCard>

      <SectionCard title="About ResQ1">
        <InfoRow label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
        <PrimaryButton title="About ResQ1" onPress={() => router.push('/settings/about' as Href)} />
      </SectionCard>

      <PrimaryButton title="Sign Out" tone="red" onPress={handleSignOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  appearanceCopy: {
    gap: spacing.xs,
  },
  appearanceTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  appearanceDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  themeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  themeOptionSelected: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.blueBorder,
  },
  themeOptionPressed: {
    opacity: 0.72,
  },
  themeOptionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  themeOptionLabelSelected: {
    color: colors.blue,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  radioOuterSelected: {
    borderColor: colors.blueBorder,
  },
  radioInner: {
    backgroundColor: colors.blue,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  privacyLoadingState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 58,
  },
  privacyLoadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  privacySettingsList: {
    backgroundColor: colors.controlSurfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  privacySettingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 94,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  privacySettingDivider: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  privacyIcon: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  privacySettingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  privacySettingTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  privacySettingDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  privacyError: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
});
