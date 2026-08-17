import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthButton,
  AuthTextField,
  BackButton,
  LanguageSelector,
  LinkButton,
  PasswordField,
  StatusBanner,
} from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { isAuthApiError, registerResident } from '@/services/authService';
import type { FieldErrors, PreferredLanguage, RegisterResidentPayload } from '@/types/auth';

type RegistrationForm = Omit<RegisterResidentPayload, 'preferredLanguage'> & {
  confirmPassword: string;
  preferredLanguage: PreferredLanguage | '';
};

const initialForm: RegistrationForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  location: '',
  preferredLanguage: '',
};

function validateForm(form: RegistrationForm) {
  const payload = {
    fullName: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    password: form.password,
    location: form.location.trim(),
    preferredLanguage: form.preferredLanguage,
  };
  const errors: FieldErrors & { confirmPassword?: string } = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!payload.fullName) {
    errors.fullName = 'Full name is required.';
  }

  if (!payload.email) {
    errors.email = 'Email address is required.';
  } else if (!emailPattern.test(payload.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!payload.password) {
    errors.password = 'Password is required.';
  } else if (payload.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (form.confirmPassword !== payload.password) {
    errors.confirmPassword = 'Passwords must match.';
  }

  if (!payload.location) {
    errors.location = 'Location or area is required.';
  }

  if (!payload.preferredLanguage) {
    errors.preferredLanguage = 'Preferred language is required.';
  }

  return {
    payload: payload as RegisterResidentPayload,
    errors,
  };
}

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors & { confirmPassword?: string }>({});
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (field: keyof RegistrationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleRegister = async () => {
    const validation = validateForm(form);
    setMessage(null);

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      return;
    }

    setSubmitting(true);

    try {
      await registerResident(validation.payload);
      router.replace({
        pathname: '/auth/login',
        params: {
          registered: '1',
          email: validation.payload.email,
        },
      } as unknown as Href);
    } catch (error) {
      if (isAuthApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
        setMessage(error.message);
      } else {
        if (__DEV__) {
          console.warn('Unexpected registration error:', error);
        }

        setMessage('Registration could not be completed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <BackButton onPress={() => router.replace('/auth/welcome' as Href)} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Resident Registration</Text>
            <Text style={styles.title}>Create your ResQ1 account</Text>
            <Text style={styles.subtitle}>
              Join your local early-warning network with a resident profile.
            </Text>
          </View>

          {message ? <StatusBanner message={message} type="error" /> : null}

          <View style={styles.form}>
            <AuthTextField
              autoCapitalize="words"
              autoComplete="name"
              error={fieldErrors.fullName}
              label="Full Name"
              onChangeText={(value) => updateField('fullName', value)}
              placeholder="Sample Resident"
              textContentType="name"
              value={form.fullName}
            />
            <AuthTextField
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
              keyboardType="email-address"
              label="Email Address"
              onChangeText={(value) => updateField('email', value)}
              placeholder="resident@example.com"
              textContentType="emailAddress"
              value={form.email}
            />
            <PasswordField
              autoCapitalize="none"
              autoComplete="new-password"
              error={fieldErrors.password}
              label="Password"
              onChangeText={(value) => updateField('password', value)}
              placeholder="Minimum 8 characters"
              textContentType="newPassword"
              value={form.password}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((current) => !current)}
            />
            <PasswordField
              autoCapitalize="none"
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
              label="Confirm Password"
              onChangeText={(value) => updateField('confirmPassword', value)}
              placeholder="Re-enter password"
              textContentType="newPassword"
              value={form.confirmPassword}
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword((current) => !current)}
            />
            <AuthTextField
              autoCapitalize="words"
              error={fieldErrors.location}
              label="Location / Area"
              onChangeText={(value) => updateField('location', value)}
              placeholder="Panadura"
              textContentType="addressCity"
              value={form.location}
            />
            <LanguageSelector
              error={fieldErrors.preferredLanguage}
              value={form.preferredLanguage}
              onChange={(language: PreferredLanguage) => updateField('preferredLanguage', language)}
            />
          </View>

          <View style={styles.actions}>
            <AuthButton
              disabled={submitting}
              loading={submitting}
              title="Create Account"
              onPress={handleRegister}
            />
            <LinkButton
              title="Already have an account? Login"
              onPress={() => router.replace('/auth/login' as Href)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 22,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
  form: {
    gap: 16,
  },
  actions: {
    gap: 14,
    paddingBottom: 12,
  },
});
