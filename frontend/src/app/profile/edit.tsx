import { Redirect, useRouter, type Href } from 'expo-router';

import {
  AppHeader,
  DemoNotice,
  InfoRow,
  LoadingState,
  ScreenContainer,
  SectionCard,
} from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';

export default function EditProfileScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading profile editor..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Future Profile Tools"
        title="Edit Profile"
        subtitle="This screen is prepared for Sprint 2 profile update APIs."
        onBack={() => router.replace('/profile' as Href)}
      />
      <DemoNotice text="No profile update endpoint exists in the current frontend service layer, so this screen does not save changes." />
      <SectionCard title="Current Real Account Data">
        <InfoRow label="Full Name" value={user.fullName} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Location" value={user.location || 'Not set'} />
        <InfoRow label="Preferred Language" value={user.preferredLanguage} />
      </SectionCard>
    </ScreenContainer>
  );
}
