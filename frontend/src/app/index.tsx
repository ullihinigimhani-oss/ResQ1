import { Image } from 'expo-image';
import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import resq1Logo from '@/assets/images/resq1-logo.jfif';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

export default function LaunchScreen() {
  const { isLoading, user } = useAuth();
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashReady(true), 650);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !splashReady) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoShell}>
          <Image contentFit="contain" source={resq1Logo} style={styles.logo} />
        </View>
        <View style={styles.brandBlock}>
          <Text style={styles.appName}>ResQ1</Text>
          <Text style={styles.tagline}>Early Alert • Quick Response • Safer Community</Text>
        </View>
        <ActivityIndicator color={BrandColors.white} size="small" />
      </View>
    );
  }

  return <Redirect href={(user ? '/dashboard' : '/auth/welcome') as Href} />;
}

const styles = StyleSheet.create({
  splashContainer: {
    alignItems: 'center',
    backgroundColor: BrandColors.navy,
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoShell: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    height: 104,
    justifyContent: 'center',
    padding: 12,
    width: 104,
  },
  logo: {
    height: '100%',
    width: '100%',
  },
  brandBlock: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    color: BrandColors.white,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  tagline: {
    color: BrandColors.sky,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
});
