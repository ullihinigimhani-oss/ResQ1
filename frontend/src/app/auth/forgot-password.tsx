import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthButton,
  BackButton,
  StatusBanner,
} from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <BackButton onPress={() => router.replace('/auth/login' as Href)} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Account Recovery</Text>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Password reset is prepared for a future backend endpoint.
            </Text>
          </View>

          <StatusBanner
            message="ResQ1 Sprint 1 does not expose a password-reset API, so no reset email is sent from this screen."
            type="error"
          />

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>What to do now</Text>
            <Text style={styles.panelText}>
              Contact your local ResQ1 administrator or return to login if you remember your password.
            </Text>
          </View>

          <AuthButton title="Back to Login" onPress={() => router.replace('/auth/login' as Href)} />
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
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  panelTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  panelText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
});
