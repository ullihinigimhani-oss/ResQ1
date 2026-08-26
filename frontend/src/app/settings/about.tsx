import { Redirect, useRouter, type Href } from 'expo-router';
import { Text } from 'react-native';

import {
  AppHeader,
  InfoRow,
  LoadingState,
  ScreenContainer,
  SectionCard,
} from '@/components/ui/app-components';
import { colors, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';

export default function AboutScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading ResQ1 information..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="About"
        title="About ResQ1"
        subtitle="Local Disaster & Flood Early-Warning Network"
        onBack={() => router.replace('/settings' as Href)}
      />
      <SectionCard title="Mission" tone="navy">
        <Text style={{ color: colors.sky, ...typography.body }}>
          ResQ1 connects residents, local authorities, safe shelters, and emergency routes through a verified civic response experience.
        </Text>
      </SectionCard>
      <SectionCard title="Current Sprint 1 Backend">
        <InfoRow label="Authentication" value="Registration, login, JWT/session storage" />
        <InfoRow label="Alerts" value="Active alerts, alert details, authority publishing" />
        <InfoRow label="Incidents" value="Resident incident creation, list, details, status tracking" />
        <InfoRow label="Shelters" value="Verified shelters and evacuation routes" />
      </SectionCard>
      <SectionCard title="Sprint 2 Readiness">
        <InfoRow label="Prepared UI" value="Household, assistance, photos, preferences, emergency contacts" />
      </SectionCard>
    </ScreenContainer>
  );
}
