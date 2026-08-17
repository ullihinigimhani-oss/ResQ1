import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Redirect, useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/common/auth-components';
import resq1Logo from '@/assets/images/resq1-logo.jfif';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

export default function DashboardScreen() {
  const router = useRouter();
  const { isLoading, signOut, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer} />
      </SafeAreaView>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/welcome' as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            contentFit="contain"
            source={resq1Logo}
            style={styles.logo}
          />
          <Text style={styles.heroTitle}>ResQ1</Text>
          <Text style={styles.heroSubtitle}>Early Alert • Quick Response • Safer Community</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionEyebrow}>Authenticated Resident</Text>
          <Text style={styles.welcome}>Hello, {user.fullName}</Text>
          <Text style={styles.copy}>
            Your account is active and ready for the next ResQ1 disaster-management features.
          </Text>

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Area</Text>
              <Text style={styles.detailValue}>{user.location || 'Not set'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailValue}>{user.preferredLanguage}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{user.role}</Text>
            </View>
          </View>
        </View>

        <AuthButton title="Sign Out" variant="danger" onPress={handleSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.navy,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 22,
    padding: 22,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 18,
  },
  logo: {
    aspectRatio: 1,
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    width: 156,
  },
  heroTitle: {
    color: BrandColors.white,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginTop: 14,
  },
  heroSubtitle: {
    color: BrandColors.sky,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    gap: 12,
    padding: 18,
  },
  sectionEyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  welcome: {
    color: BrandColors.navy,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  copy: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  detailGrid: {
    gap: 10,
    marginTop: 6,
  },
  detailItem: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 8,
    padding: 14,
  },
  detailLabel: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
    marginTop: 4,
    textTransform: 'capitalize',
  },
});
