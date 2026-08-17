import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { AuthProvider } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync().catch(() => null);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => null);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
