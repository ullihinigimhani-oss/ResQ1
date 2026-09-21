import Constants from 'expo-constants';
import { Redirect, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  AppHeader,
  DemoNotice,
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
import { isAuthorityRole } from '@/utils/format';

const themeOptions: { icon: string; label: string; value: AppTheme }[] = [
  { icon: 'sun.max.fill', label: 'Light', value: 'light' },
  { icon: 'moon.fill', label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { isLoading, signOut, user } = useAuth();
  const { setTheme, theme } = useAppTheme();

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

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow={isAuthorityRole(user.role) ? 'Authority Preferences' : 'Resident Preferences'}
        title="Settings"
        subtitle="Frontend-safe settings without exposing secrets or unsupported persistence."
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
        <DemoNotice text="Privacy controls are UI-ready. Backend privacy preference storage is not implemented in Sprint 1." />
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
    fontWeight: '900',
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
    fontWeight: '800',
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
});
