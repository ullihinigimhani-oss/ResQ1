import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/common/auth-components';
import resq1Logo from '@/assets/images/resq1-logo.jfif';
import { BrandColors } from '@/constants/brand';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <View style={styles.logoShell}>
            <Image
              contentFit="contain"
              source={resq1Logo}
              style={styles.logo}
            />
          </View>

          <Text style={styles.appName}>ResQ1</Text>
          <Text style={styles.subtitle}>Local Disaster & Flood Early-Warning Network</Text>
          <Text style={styles.tagline}>Early Alert • Quick Response • Safer Community</Text>
        </View>

        <View style={styles.messageBlock}>
          <Text style={styles.description}>
            Receive verified disaster warnings, report incidents, and access emergency information
            for your local community.
          </Text>
        </View>

        <View style={styles.actions}>
          <AuthButton title="Create Account" onPress={() => router.push('/auth/register' as Href)} />
          <AuthButton
            title="Login"
            onPress={() => router.push('/auth/login' as Href)}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
    maxWidth: 560,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 14,
  },
  logoShell: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 240,
    padding: 12,
    width: '100%',
  },
  logo: {
    aspectRatio: 1,
    maxWidth: 216,
    width: '100%',
  },
  appName: {
    color: BrandColors.navy,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: BrandColors.deepBlue,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  tagline: {
    color: BrandColors.red,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  messageBlock: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 24,
    padding: 16,
  },
  description: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  actions: {
    gap: 12,
  },
});
