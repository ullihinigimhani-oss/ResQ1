import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  LinkButton,
  PasswordField,
  StatusBanner,
} from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { AuthApiError, loginResident } from '@/services/authService';
import type { FieldErrors } from '@/types/auth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { completeLogin } = useAuth();
  const initialEmail = useMemo(() => firstParam(params.email) ?? '', [params.email]);
  const registrationSuccess = firstParam(params.registered) === '1';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const validate = () => {
    const normalizedEmail = email.trim().toLowerCase();
    const errors: FieldErrors = {};

    if (!normalizedEmail) {
      errors.email = 'Email address is required.';
    } else if (!emailPattern.test(normalizedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    return {
      payload: {
        email: normalizedEmail,
        password,
      },
      errors,
    };
  };

  const handleLogin = async () => {
    const validation = validate();
    setMessage(null);

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      return;
    }

    setSubmitting(true);

    try {
      const session = await loginResident(validation.payload);
      await completeLogin(session, remember);
      router.replace('/dashboard' as Href);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFieldErrors(error.fieldErrors ?? {});
        setMessage(error.message);
      } else {
        setMessage('Login could not be completed. Please try again.');
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
            <Text style={styles.eyebrow}>Resident Login</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue receiving verified local alerts.</Text>
          </View>

          {registrationSuccess ? (
            <StatusBanner message="Account created successfully. Please log in." type="success" />
          ) : null}
          {message ? <StatusBanner message={message} type="error" /> : null}

          <View style={styles.form}>
            <AuthTextField
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) => {
                setEmail(value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              placeholder="resident@example.com"
              textContentType="emailAddress"
              value={email}
            />
            <PasswordField
              autoCapitalize="none"
              autoComplete="current-password"
              error={fieldErrors.password}
              label="Password"
              onChangeText={(value) => {
                setPassword(value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              placeholder="Enter password"
              textContentType="password"
              value={password}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((current) => !current)}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: remember }}
              onPress={() => setRemember((current) => !current)}
              style={({ pressed }) => [styles.rememberRow, pressed && styles.pressed]}>
              <SymbolView
                name={{
                  ios: remember ? 'checkmark.square.fill' : 'square',
                  android: remember ? 'check_box' : 'check_box_outline_blank',
                  web: remember ? 'check_box' : 'check_box_outline_blank',
                }}
                size={22}
                tintColor={remember ? BrandColors.deepBlue : BrandColors.muted}
                fallback={<Text style={styles.checkboxFallback}>{remember ? '[x]' : '[ ]'}</Text>}
              />
              <Text style={styles.rememberText}>Remember login on this device</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <AuthButton
              disabled={submitting}
              loading={submitting}
              title="Login"
              onPress={handleLogin}
            />
            <LinkButton
              title="Don't have an account? Create Account"
              onPress={() => router.replace('/auth/register' as Href)}
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
    gap: 24,
    justifyContent: 'center',
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
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
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
  rememberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
  },
  rememberText: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  checkboxFallback: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
  },
  actions: {
    gap: 14,
  },
  pressed: {
    opacity: 0.72,
  },
});
