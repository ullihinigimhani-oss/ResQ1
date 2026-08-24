import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
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
  PasswordField,
  StatusBanner,
} from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import {
  isAuthApiError,
  requestForgotPassword,
  resetAccountPassword,
  verifyResetOtp,
} from '@/services/authService';
import type { FieldErrors } from '@/types/auth';

type Step = 'request' | 'verify' | 'reset' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async () => {
    setStatusMessage(null);
    setFieldErrors({});

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFieldErrors({ email: 'Email address is required.' });
      return;
    }

    setLoading(true);
    try {
      const result = await requestForgotPassword({ email: trimmedEmail });
      setStatusMessage({ type: 'success', message: result.message });
      setResendCooldown(60);
      setStep('verify');
    } catch (error) {
      if (isAuthApiError(error)) {
        setStatusMessage({ type: 'error', message: error.message });
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setStatusMessage({ type: 'error', message: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;

    setStatusMessage(null);
    setLoading(true);
    try {
      const result = await requestForgotPassword({ email: email.trim().toLowerCase() });
      setStatusMessage({ type: 'success', message: result.message });
      setResendCooldown(60);
    } catch (error) {
      if (isAuthApiError(error)) {
        setStatusMessage({ type: 'error', message: error.message });
      } else {
        setStatusMessage({ type: 'error', message: 'Failed to resend verification code.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setStatusMessage(null);
    setFieldErrors({});

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setFieldErrors({ otp: 'Verification code is required.' });
      return;
    }

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setFieldErrors({ otp: 'Enter the 6-digit verification code.' });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyResetOtp({
        email: email.trim().toLowerCase(),
        otp: trimmedOtp,
      });

      setResetToken(result.resetToken);
      setStatusMessage({ type: 'success', message: 'Code verified successfully.' });
      setStep('reset');
    } catch (error) {
      if (isAuthApiError(error)) {
        setStatusMessage({ type: 'error', message: error.message });
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setStatusMessage({ type: 'error', message: 'Verification failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
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
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const result = await resetAccountPassword({
        resetToken,
        newPassword,
      });

      setStatusMessage({ type: 'success', message: result.message });
      setStep('success');
    } catch (error) {
      if (isAuthApiError(error)) {
        setStatusMessage({ type: 'error', message: error.message });
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setStatusMessage({ type: 'error', message: 'Password reset failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <BackButton
            onPress={() => {
              if (step === 'verify') setStep('request');
              else if (step === 'reset') setStep('verify');
              else router.replace('/auth/login' as Href);
            }}
          />

          {step === 'request' && (
            <>
              <View style={styles.header}>
                <Text style={styles.eyebrow}>Account Recovery</Text>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>
                  Enter your registered email address to receive a 6-digit verification code via email.
                </Text>
              </View>

              {statusMessage && <StatusBanner type={statusMessage.type} message={statusMessage.message} />}

              <View style={styles.formGroup}>
                <AuthTextField
                  autoCapitalize="none"
                  autoComplete="email"
                  error={fieldErrors.email}
                  keyboardType="email-address"
                  label="Registered Email Address"
                  onChangeText={(val) => {
                    setEmail(val);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="name@example.com"
                  value={email}
                />

                <AuthButton
                  loading={loading}
                  onPress={handleRequestOtp}
                  title="Send Verification Code"
                />
              </View>
            </>
          )}

          {step === 'verify' && (
            <>
              <View style={styles.header}>
                <Text style={styles.eyebrow}>Verification Code</Text>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to <Text style={styles.emailHighlight}>{email}</Text>.
                </Text>
              </View>

              {statusMessage && <StatusBanner type={statusMessage.type} message={statusMessage.message} />}

              <View style={styles.formGroup}>
                <AuthTextField
                  autoCapitalize="none"
                  error={fieldErrors.otp}
                  keyboardType="number-pad"
                  label="6-Digit Verification Code"
                  maxLength={6}
                  onChangeText={(val) => {
                    setOtp(val);
                    if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                  }}
                  placeholder="123456"
                  value={otp}
                />

                <AuthButton loading={loading} onPress={handleVerifyOtp} title="Verify Code" />

                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Didn't receive the email? </Text>
                  <Pressable
                    disabled={resendCooldown > 0 || loading}
                    onPress={() => {
                      if (Platform.OS === 'web' && typeof document !== 'undefined') {
                        (document.activeElement as HTMLElement)?.blur?.();
                      }
                      handleResendOtp();
                    }}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <Text
                      style={[
                        styles.resendLink,
                        (resendCooldown > 0 || loading) && styles.resendDisabled,
                      ]}>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {step === 'reset' && (
            <>
              <View style={styles.header}>
                <Text style={styles.eyebrow}>Create New Password</Text>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter and confirm your new password below.
                </Text>
              </View>

              {statusMessage && <StatusBanner type={statusMessage.type} message={statusMessage.message} />}

              <View style={styles.formGroup}>
                <PasswordField
                  error={fieldErrors.newPassword}
                  label="New Password"
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }}
                  onToggleVisible={() => setShowNewPassword((prev) => !prev)}
                  placeholder="••••••••"
                  value={newPassword}
                  visible={showNewPassword}
                />

                <PasswordField
                  error={fieldErrors.confirmPassword}
                  label="Confirm New Password"
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
                  placeholder="••••••••"
                  value={confirmPassword}
                  visible={showConfirmPassword}
                />

                <AuthButton loading={loading} onPress={handleResetPassword} title="Reset Password" />
              </View>
            </>
          )}

          {step === 'success' && (
            <>
              <View style={styles.header}>
                <Text style={styles.eyebrow}>Recovery Complete</Text>
                <Text style={styles.title}>Password Reset!</Text>
                <Text style={styles.subtitle}>
                  Your account password has been updated successfully. You can now log in using your new credentials.
                </Text>
              </View>

              {statusMessage && <StatusBanner type={statusMessage.type} message={statusMessage.message} />}

              <AuthButton title="Back to Login" onPress={() => router.replace('/auth/login' as Href)} />
            </>
          )}
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
  emailHighlight: {
    color: BrandColors.navy,
    fontWeight: '800',
  },
  formGroup: {
    gap: 16,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resendText: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  resendLink: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '800',
  },
  resendDisabled: {
    color: BrandColors.muted,
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.72,
  },
});
