import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import {
  AppHeader,
  DemoNotice,
  LoadingState,
  ScreenContainer,
  SectionCard,
  SegmentedOptions,
} from '@/components/ui/app-components';
import { AuthTextField } from '@/components/common/auth-components';
import { useAuth } from '@/context/auth-context';
import { isAuthorityRole } from '@/utils/format';

const reviewActions = ['Verified', 'Needs More Information', 'Invalid Report'] as const;

export default function IncidentReviewScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [action, setAction] = useState<(typeof reviewActions)[number]>('Verified');
  const [notes, setNotes] = useState('');

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Checking review access..." />
      </ScreenContainer>
    );
  }

  if (!isAuthorityRole(user.role)) {
    return (
      <ScreenContainer>
        <AppHeader
          eyebrow="Restricted Module"
          title="Incident Review"
          subtitle="Resident users cannot access official incident review actions."
          onBack={() => router.replace('/incidents' as Href)}
        />
        <DemoNotice text="This route remains hidden from resident workflows and does not weaken backend authorization." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Official Review"
        title="Incident Review"
        subtitle="Role-aware UI prepared for future officer workflows."
        onBack={() => router.replace('/incidents' as Href)}
      />
      <DemoNotice text="The backend exposes status updates for authorized users, but this frontend review workflow is not connected to a service yet." />
      <SectionCard title="Review Action">
        <SegmentedOptions options={reviewActions} value={action} onChange={setAction} />
      </SectionCard>
      <SectionCard title="Officer Notes">
        <AuthTextField
          label="Notes"
          multiline
          numberOfLines={6}
          onChangeText={setNotes}
          placeholder="Add official notes for future review service integration."
          textAlignVertical="top"
          value={notes}
        />
      </SectionCard>
    </ScreenContainer>
  );
}
