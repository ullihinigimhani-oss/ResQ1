import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { BrandColors } from '@/constants/brand';
import { AuthProvider } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync().catch(() => null);

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => null);
  }, []);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: BrandColors.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/welcome" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="incidents/index" />
        <Stack.Screen name="incidents/report" />
        <Stack.Screen name="incidents/[id]" />
      </Stack>
    </AuthProvider>
  );
}
