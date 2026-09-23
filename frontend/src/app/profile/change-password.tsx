import { Redirect, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AuthButton,
  LinkButton,
  PasswordField,
  StatusBanner,
} from '@/components/common/auth-components';
import {
  AppHeader,
  LoadingState,
  ScreenContainer,
  SectionCard,
  SecondaryButton,
} from '@/components/ui/app-components';
import { BrandColors } from '@/constants/brand';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  changeAccountPassword,
  isAuthApiError,
  verifyCurrentPassword,
} from '@/services/authService';
import type { FieldErrors } from '@/types/auth';

type Step = 'verify-old' | 'set-new' | 'success';

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { isLoading, signOut, token, user } = useAuth();

  const [step, setStep] = useState<Step>('verify-old');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const criteria = useMemo<PasswordCriteria[]>(() => {
    return [
      { label: 'At least 8 characters', met: newPassword.length >= 8 },
      { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
      { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
      { label: 'At least one number (0-9)', met: /\d/.test(newPassword) },
    ];
  }, [newPassword]);

  const passwordsMatch = useMemo(() => {
    return Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  }, [confirmPassword, newPassword]);

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

  const handleVerifyOldPassword = async () => {
    setStatusMessage(null);
    setFieldErrors({});

    const trimmedOldPassword = currentPassword.trim();
    if (!trimmedOldPassword) {
      setFieldErrors({ currentPassword: 'Current password is required.' });
      return;
    }

    if (!token) {
      setStatusMessage({
        type: 'error',
        message: 'Your session has expired. Please log in again.',
      });
      return;
    }

    setLoading(true);

    try {
      await verifyCurrentPassword(token, { currentPassword: trimmedOldPassword });
      setStatusMessage({
        type: 'success',
        message: 'Current password verified. You can now set your new password.',
      });
      setStep('set-new');
    } catch (error) {
      if (isAuthApiError(error)) {
        setStatusMessage({ type: 'error', message: error.message });
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Verification failed. Please check your connection and try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setStatusMessage(null);
    setFieldErrors({});

    const errors: FieldErrors = {};

    if (!newPassword) {
      errors.newPassword = 'Password is required.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters.';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Password must include at least one uppercase letter.';
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = 'Password must include at least one lowercase letter.';
    } else if (!/\d/.test(newPassword)) {
      errors.newPassword = 'Password must include at least one number.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords must match.';
    }

    if (newPassword && currentPassword && newPassword === currentPassword) {
      errors.newPassword = 'New password cannot be the same as your current password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!token) {
      setStatusMessage({
        type: 'error',
        message: 'Your session has expired. Please log in again.',
      });
      return;
    }

    setLoading(true);

    try {
      await changeAccountPassword(token, {
        currentPassword: currentPassword.trim(),
        newPassword,
      });

      // Clear the current session so the user must log in with their new password
      await signOut();
      setStep('success');
    } catch (error) {
      if (isAuthApiError(error)) {
        setStatusMessage({ type: 'error', message: error.message });
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to change password. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer bottomNav={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <AppHeader
          eyebrow="Account Security"
          title={step === 'success' ? 'Password Changed' : 'Change Password'}
          subtitle={
            step === 'verify-old'
              ? 'Verify your current password to continue.'
              : step === 'set-new'
                ? 'Create a strong, new password for your account.'
                : 'Your password has been updated successfully.'
          }
          onBack={() => {
            if (step === 'set-new') {
              setStep('verify-old');
              setStatusMessage(null);
            } else if (step === 'success') {
              router.replace('/auth/login' as Href);
            } else {
              router.replace('/profile' as Href);
            }
          }}
        />

        {step !== 'success' && (
          <View style={styles.stepIndicatorRow}>
            <View
              style={[
                styles.stepChip,
                step === 'verify-old' && styles.stepChipActive,
                step === 'set-new' && styles.stepChipCompleted,
              ]}>
              <Text
                style={[
                  styles.stepChipText,
                  (step === 'verify-old' || step === 'set-new') && styles.stepChipTextActive,
                ]}>
                1. Verify Old Password
              </Text>
            </View>
            <View
              style={[
                styles.stepChip,
                step === 'set-new' && styles.stepChipActive,
              ]}>
              <Text
                style={[
                  styles.stepChipText,
                  step === 'set-new' && styles.stepChipTextActive,
                ]}>
                2. Set New Password
              </Text>
            </View>
          </View>
        )}

        {statusMessage && (
          <StatusBanner type={statusMessage.type} message={statusMessage.message} />
        )}

        {step === 'verify-old' && (
          <SectionCard title="Verify Current Password">
            <Text style={styles.instructionText}>
              For security, please enter your existing account password before choosing a new one.
            </Text>

            <PasswordField
              autoCapitalize="none"
              error={fieldErrors.currentPassword}
              label="Current Password"
              onChangeText={(val) => {
                setCurrentPassword(val);
                if (fieldErrors.currentPassword) {
                  setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }
              }}
              onToggleVisible={() => setShowCurrentPassword((prev) => !prev)}
              placeholder="••••••••"
              value={currentPassword}
              visible={showCurrentPassword}
            />

            <AuthButton
              loading={loading}
              onPress={handleVerifyOldPassword}
              title="Verify & Continue"
            />

            <View style={styles.linkContainer}>
              <Text style={styles.helperText}>Forgot your existing password?</Text>
              <LinkButton
                onPress={() => router.push('/auth/forgot-password' as Href)}
                title="Reset via Email OTP"
              />
            </View>
          </SectionCard>
        )}

        {step === 'set-new' && (
          <SectionCard title="Enter New Password">
            <Text style={styles.instructionText}>
              Your new password must meet all the security requirements below.
            </Text>

            <PasswordField
              autoCapitalize="none"
              error={fieldErrors.newPassword}
              label="New Password"
              onChangeText={(val) => {
                setNewPassword(val);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              onToggleVisible={() => setShowNewPassword((prev) => !prev)}
              placeholder="••••••••"
              value={newPassword}
              visible={showNewPassword}
            />

            <View style={styles.criteriaCard}>
              <Text style={styles.criteriaHeading}>Password Requirements:</Text>
              {criteria.map((item, index) => (
                <View key={index} style={styles.criteriaItem}>
                  <Text style={[styles.criteriaDot, item.met && styles.criteriaDotMet]}>
                    {item.met ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.criteriaLabel, item.met && styles.criteriaLabelMet]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <PasswordField
              autoCapitalize="none"
              error={fieldErrors.confirmPassword}
              label="Confirm New Password"
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
              placeholder="••••••••"
              value={confirmPassword}
              visible={showConfirmPassword}
            />

            {confirmPassword.length > 0 && (
              <View style={styles.matchStatusRow}>
                <Text
                  style={[
                    styles.matchStatusText,
                    passwordsMatch ? styles.matchSuccessText : styles.matchErrorText,
                  ]}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </Text>
              </View>
            )}

            <View style={styles.buttonStack}>
              <AuthButton
                loading={loading}
                onPress={handleChangePassword}
                title="Save New Password"
              />
              <SecondaryButton
                onPress={() => {
                  setStep('verify-old');
                  setStatusMessage(null);
                }}
                title="Back to Step 1"
              />
            </View>
          </SectionCard>
        )}

        {step === 'success' && (
          <SectionCard title="Password Updated">
            <View style={styles.successBlock}>
              <Text style={styles.successTitle}>Password Changed Successfully!</Text>
              <Text style={styles.successBody}>
                Your account password has been updated. You have been safely logged out and can now log in using your new credentials.
              </Text>
            </View>

            <AuthButton
              onPress={() => router.replace('/auth/login' as Href)}
              title="Log In with New Password"
            />
          </SectionCard>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
  },
  stepChipActive: {
    borderColor: BrandColors.blue,
    backgroundColor: BrandColors.controlSurface,
  },
  stepChipCompleted: {
    borderColor: BrandColors.success,
    backgroundColor: BrandColors.controlSurface,
  },
  stepChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.muted,
  },
  stepChipTextActive: {
    color: BrandColors.text,
    fontWeight: '700',
  },
  instructionText: {
    color: BrandColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  criteriaCard: {
    backgroundColor: BrandColors.controlSurface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  criteriaHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.muted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criteriaDot: {
    fontSize: 13,
    color: BrandColors.muted,
    fontWeight: '800',
    width: 16,
    textAlign: 'center',
  },
  criteriaDotMet: {
    color: BrandColors.success,
  },
  criteriaLabel: {
    fontSize: 13,
    color: BrandColors.muted,
    fontWeight: '500',
  },
  criteriaLabelMet: {
    color: BrandColors.text,
    fontWeight: '600',
  },
  matchStatusRow: {
    paddingHorizontal: 4,
    marginTop: -4,
  },
  matchStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  matchSuccessText: {
    color: BrandColors.success,
  },
  matchErrorText: {
    color: BrandColors.red,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  helperText: {
    color: BrandColors.muted,
    fontSize: 13,
  },
  buttonStack: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  successBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.text,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    lineHeight: 22,
    color: BrandColors.muted,
    textAlign: 'center',
  },
});
