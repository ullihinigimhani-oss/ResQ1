import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton } from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'R';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatRole(role: string) {
  return role
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoading, signOut, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BrandColors.red} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/welcome' as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.replace('/dashboard' as Href)} />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Resident Account</Text>
          <Text style={styles.title}>My Profile</Text>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
          </View>
          <View style={styles.identityBlock}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <InfoRow label="Full Name" value={user.fullName} />
          <InfoRow label="Email Address" value={user.email} />
          <InfoRow label="Area / Location" value={user.location || 'Not set'} />
          <InfoRow label="Preferred Language" value={user.preferredLanguage} />
          <InfoRow label="Role" value={formatRole(user.role)} />
        </View>

        <View style={styles.signOutBlock}>
          <AuthButton title="Sign Out" variant="danger" onPress={handleSignOut} />
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
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    gap: 18,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.sky,
    borderRadius: 31,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  avatarText: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  identityBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: BrandColors.white,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },
  email: {
    color: BrandColors.sky,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 0,
    padding: 16,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 4,
  },
  infoRow: {
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingVertical: 13,
  },
  infoLabel: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  signOutBlock: {
    marginTop: 'auto',
    paddingBottom: 8,
  },
});
