import { Redirect, useRouter, type Href } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { BasicPhoneResidentForm } from '@/components/basic-phone-residents/basic-phone-resident-form';
import { AppHeader, LoadingState, ScreenContainer } from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';
import { createBasicPhoneResident } from '@/services/basicPhoneResidentService';
import { isCommunityMemberRole } from '@/utils/format';

export default function AddBasicPhoneResidentScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!isLoading && user && !isCommunityMemberRole(user.role)) {
    return <Redirect href={'/dashboard' as Href} />;
  }

  if (isLoading || !user || !token) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading resident registration..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <AppHeader
          eyebrow="Community Member"
          onBack={() => router.back()}
          subtitle="Add a resident who relies on a basic mobile phone."
          title="Add Resident"
        />
        <BasicPhoneResidentForm
          onCancel={() => router.back()}
          onSubmit={async (payload) => {
            await createBasicPhoneResident(token, payload);
            router.replace({
              pathname: '/basic-phone-residents',
              params: { notice: 'added' },
            } as unknown as Href);
          }}
          submitTitle="Register Resident"
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
