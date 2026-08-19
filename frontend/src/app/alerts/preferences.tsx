import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import {
  AppHeader,
  DemoNotice,
  LoadingState,
  ScreenContainer,
  SectionCard,
  StatusBadge,
  ToggleRow,
} from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';
import { defaultAlertPreferences } from '@/services/futureServices';

export default function AlertPreferencesScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [preferences, setPreferences] = useState(defaultAlertPreferences);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading alert preferences..." />
      </ScreenContainer>
    );
  }

  const toggle = (key: keyof typeof defaultAlertPreferences) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Alert Preferences"
        title="Notification Settings"
        subtitle="Local UI state only until preference APIs are connected."
        onBack={() => router.replace('/alerts' as Href)}
      />

      <DemoNotice text="Alert preferences are kept in screen state for now. No preference changes are written to the backend." />

      <SectionCard title="Location-Based Alerts">
        <ToggleRow
          title="Location-Based Alerts"
          subtitle={user.location ? `Using registered area: ${user.location}` : 'Registered area not set'}
          value={preferences.locationAlerts}
          onToggle={() => toggle('locationAlerts')}
        />
      </SectionCard>

      <SectionCard title="Alert Types">
        <ToggleRow title="Flood" value={preferences.flood} onToggle={() => toggle('flood')} />
        <ToggleRow title="Landslide" value={preferences.landslide} onToggle={() => toggle('landslide')} />
        <ToggleRow title="Severe Weather" value={preferences.severeWeather} onToggle={() => toggle('severeWeather')} />
        <ToggleRow title="Community Safety" value={preferences.communitySafety} onToggle={() => toggle('communitySafety')} />
      </SectionCard>

      <SectionCard title="Critical Emergency Alerts">
        <StatusBadge label="Always On" tone="red" />
        <ToggleRow
          locked
          title="Critical Emergency Alerts"
          subtitle="Critical alerts cannot be disabled."
          value
        />
      </SectionCard>

      <SectionCard title="Device Notifications">
        <ToggleRow title="Push Notifications" value={preferences.pushNotifications} onToggle={() => toggle('pushNotifications')} />
        <ToggleRow title="Alert Sound" value={preferences.alertSound} onToggle={() => toggle('alertSound')} />
        <ToggleRow title="Vibration" value={preferences.vibration} onToggle={() => toggle('vibration')} />
        <ToggleRow title="Quiet Hours" value={preferences.quietHours} onToggle={() => toggle('quietHours')} />
      </SectionCard>
    </ScreenContainer>
  );
}
