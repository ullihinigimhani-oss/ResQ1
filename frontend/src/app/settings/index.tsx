import Constants from 'expo-constants';
import { Redirect, useRouter, type Href } from 'expo-router';

import {
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

export default function SettingsScreen() {
  const router = useRouter();
  const { isLoading, signOut, user } = useAuth();

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
        eyebrow="Resident Preferences"
        title="Settings"
        subtitle="Frontend-safe settings without exposing secrets or unsupported persistence."
      />

      <SectionCard title="Appearance">
        <ToggleRow locked title="Use System Theme" subtitle="Theme preference backend is not enabled yet." value />
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
