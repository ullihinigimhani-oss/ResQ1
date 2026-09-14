import { Redirect, useRouter, type Href } from 'expo-router';

import {
  AppHeader,
  DemoNotice,
  LoadingState,
  ScreenContainer,
  SectionCard,
} from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading password settings..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Account Security"
        title="Change Password"
        subtitle="Prepared for a future authenticated password-change endpoint."
        onBack={() => router.replace('/profile' as Href)}
      />
      <SectionCard title="Backend Gap">
        <DemoNotice text="Sprint 1 supports login and registration, but no change-password endpoint is exposed. No password data is collected here." />
      </SectionCard>
    </ScreenContainer>
  );
}
