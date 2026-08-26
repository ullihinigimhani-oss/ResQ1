import { useEffect, useMemo, useState } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  AuthTextField,
  LanguageSelector,
  StatusBanner,
} from '@/components/common/auth-components';
import {
  AppHeader,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  SecondaryButton,
} from '@/components/ui/app-components';
import { useAuth } from '@/context/auth-context';
import {
  isAuthApiError,
  updateProfile,
} from '@/services/authService';
import type { FieldErrors, PreferredLanguage, UpdateProfilePayload } from '@/types/auth';
import { toPreferredLanguage } from '@/utils/language';

export default function EditProfileScreen() {
  const router = useRouter();
  const { isLoading, token, updateCurrentUser, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>('English');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.fullName);
    setEmail(user.email);
    setLocation(user.location || '');
    setPreferredLanguage(toPreferredLanguage(user.preferredLanguage));
    setFieldErrors({});
    setStatus(null);
  }, [user]);

  const payload = useMemo<UpdateProfilePayload>(
    () => ({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      location: location.trim(),
      preferredLanguage,
    }),
    [email, fullName, location, preferredLanguage],
  );

  const hasChanges = Boolean(
    user &&
      (payload.fullName !== user.fullName ||
        payload.email !== user.email ||
        payload.location !== (user.location || '') ||
        payload.preferredLanguage !== user.preferredLanguage),
  );

  function validateForm() {
    const errors: FieldErrors = {};

    if (!payload.fullName) {
      errors.fullName = 'Full name is required.';
    }

    if (!payload.email) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!payload.location) {
      errors.location = 'Location or area is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!token || !validateForm()) {
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const updatedUser = await updateProfile(token, payload);
      await updateCurrentUser(updatedUser);
      setFieldErrors({});
      router.replace('/profile' as Href);
    } catch (error) {
      if (isAuthApiError(error)) {
        setFieldErrors(error.fieldErrors || {});
        setStatus({ type: 'error', message: error.message });
      } else {
        setStatus({ type: 'error', message: 'Profile could not be updated. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  }

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
        eyebrow="Account Settings"
        title="Edit Profile"
        subtitle="Update your account details and save them to your ResQ1 profile."
        onBack={() => router.replace('/profile' as Href)}
      />
      {status ? <StatusBanner type={status.type} message={status.message} /> : null}
      <SectionCard
        title="Profile Details"
        subtitle="Changes are saved to your account and shown across the app.">
        <View style={styles.form}>
          <AuthTextField
            autoCapitalize="words"
            error={fieldErrors.fullName}
            label="Full Name"
            onChangeText={setFullName}
            placeholder="Enter your full name"
            value={fullName}
          />
          <AuthTextField
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.email}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="Enter your email address"
            value={email}
          />
          <AuthTextField
            autoCapitalize="words"
            error={fieldErrors.location}
            label="Location"
            onChangeText={setLocation}
            placeholder="Enter your area or town"
            value={location}
          />
          <LanguageSelector
            error={fieldErrors.preferredLanguage}
            onChange={setPreferredLanguage}
            value={preferredLanguage}
          />
          <View style={styles.actions}>
            <PrimaryButton
              disabled={!hasChanges || saving}
              loading={saving}
              onPress={handleSave}
              title="Save Changes"
            />
            <SecondaryButton
              disabled={saving}
              onPress={() => router.replace('/profile' as Href)}
              title="Cancel"
            />
          </View>
        </View>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  actions: {
    gap: 12,
  },
});
