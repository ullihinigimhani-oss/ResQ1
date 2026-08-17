import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

export default function LaunchScreen() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={BrandColors.red} size="large" />
      </View>
    );
  }

  return <Redirect href={(user ? '/dashboard' : '/auth/welcome') as Href} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
