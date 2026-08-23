import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { BrandColors } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/context/auth-context';
import {
  configureForegroundNotificationHandler,
  registerResidentDeviceForPushNotifications,
} from '@/services/pushNotificationService';

SplashScreen.preventAutoHideAsync().catch(() => null);
configureForegroundNotificationHandler();

function ResidentPushNotificationRegistration() {
  const { token, user } = useAuth();

  useEffect(() => {
    void registerResidentDeviceForPushNotifications(user, token);
  }, [token, user]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => null);
  }, []);

  return (
    <AuthProvider>
      <ResidentPushNotificationRegistration />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: BrandColors.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="auth/welcome" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/about" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/change-password" />
        <Stack.Screen name="household/index" />
        <Stack.Screen name="alerts/index" />
        <Stack.Screen name="alerts/[id]" />
        <Stack.Screen name="alerts/[id]/edit" />
        <Stack.Screen name="alerts/create" />
        <Stack.Screen name="alerts/risk-level" />
        <Stack.Screen name="alerts/history" />
        <Stack.Screen name="alerts/preferences" />
        <Stack.Screen name="incidents/index" />
        <Stack.Screen name="incidents/report" />
        <Stack.Screen name="incidents/[id]" />
        <Stack.Screen name="incidents/photo-evidence" />
        <Stack.Screen name="incidents/nearby" />
        <Stack.Screen name="incidents/review" />
        <Stack.Screen name="shelters/index" />
        <Stack.Screen name="shelters/[id]" />
        <Stack.Screen name="shelters/[id]/route" />
        <Stack.Screen name="assistance/index" />
        <Stack.Screen name="contacts/index" />
      </Stack>
    </AuthProvider>
  );
}
