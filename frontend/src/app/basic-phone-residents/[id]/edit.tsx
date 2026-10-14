import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { BasicPhoneResidentForm } from '@/components/basic-phone-residents/basic-phone-resident-form';
import { StatusBanner } from '@/components/common/auth-components';
import {
  AppHeader,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
} from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';
import {
  getBasicPhoneResident,
  isBasicPhoneResidentApiError,
  updateBasicPhoneResident,
} from '@/services/basicPhoneResidentService';
import type { BasicPhoneResident } from '@/types/basicPhoneResident';
import { isCommunityMemberRole } from '@/utils/format';

export default function EditBasicPhoneResidentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { isLoading: authLoading, token, user } = useAuth();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const residentId = Number.parseInt(rawId ?? '', 10);
  const hasValidResidentId = Number.isInteger(residentId) && residentId > 0;
  const [resident, setResident] = useState<BasicPhoneResident | null>(null);
  const [loading, setLoading] = useState(hasValidResidentId);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasValidResidentId ? null : 'Invalid basic phone resident ID.',
  );

  useEffect(() => {
    let active = true;

    if (!token || !hasValidResidentId) {
      return () => {
        active = false;
      };
    }

    getBasicPhoneResident(token, residentId)
      .then((result) => {
        if (active) {
          setResident(result);
          setErrorMessage(null);
        }
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            isBasicPhoneResidentApiError(error)
              ? error.message
              : 'Unable to load this resident.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [hasValidResidentId, residentId, token]);

  if (!authLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!authLoading && user && !isCommunityMemberRole(user.role)) {
    return <Redirect href={'/dashboard' as Href} />;
  }

  if (authLoading || loading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading resident details..." />
      </ScreenContainer>
    );
  }

  if (!resident || errorMessage || !token) {
    return (
      <ScreenContainer>
        <AppHeader
          onBack={() => router.replace('/basic-phone-residents' as Href)}
          subtitle="Basic phone resident registration"
          title="Edit Resident"
        />
        <StatusBanner
          message={errorMessage ?? 'Unable to load this resident.'}
          type="error"
        />
        <PrimaryButton
          onPress={() => router.replace('/basic-phone-residents' as Href)}
          title="Back to Residents"
        />
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
          subtitle="Update this resident's emergency SMS registration details."
          title="Edit Resident"
        />
        <BasicPhoneResidentForm
          initialValues={{
            fullName: resident.fullName,
            mobileNumber: resident.mobileNumber,
            area: resident.area,
          }}
          onCancel={() => router.back()}
          onSubmit={async (payload) => {
            await updateBasicPhoneResident(token, resident.id, payload);
            router.replace({
              pathname: '/basic-phone-residents',
              params: { notice: 'updated' },
            } as unknown as Href);
          }}
          submitTitle="Save Changes"
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
