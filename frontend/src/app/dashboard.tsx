import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Redirect, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import resq1Logo from '@/assets/images/resq1-logo.jfif';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'Resident';
}

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

function DashboardAction({
  accent,
  description,
  mark,
  onPress,
  symbolName,
  title,
  variant,
}: {
  accent: 'primary' | 'secondary';
  description: string;
  mark: string;
  onPress: () => void;
  symbolName: 'exclamationmark.triangle.fill' | 'clock.arrow.circlepath';
  title: string;
  variant: 'primary' | 'secondary';
}) {
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary ? styles.primaryAction : styles.secondaryAction,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.actionMark, accent === 'primary' ? styles.actionMarkEmergency : styles.actionMarkStandard]}>
        <SymbolView
          fallback={
            <Text style={[styles.actionMarkText, accent === 'primary' ? styles.actionMarkTextEmergency : styles.actionMarkTextStandard]}>
              {mark}
            </Text>
          }
          name={symbolName}
          size={22}
          tintColor={accent === 'primary' ? BrandColors.white : BrandColors.deepBlue}
          type="monochrome"
          weight="bold"
        />
      </View>
      <View style={styles.actionTextBlock}>
        <Text style={[styles.actionTitle, primary && styles.primaryActionTitle]}>{title}</Text>
        <Text style={[styles.actionDescription, primary && styles.primaryActionDescription]}>
          {description}
        </Text>
      </View>
      <Text style={[styles.actionArrow, primary && styles.primaryActionArrow]}>{'>'}</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();

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

  const residentFirstName = firstName(user.fullName);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View style={styles.brandBlock}>
            <Image contentFit="contain" source={resq1Logo} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>ResQ1</Text>
              <Text style={styles.headerGreeting}>Hello, {residentFirstName}</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Open profile"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/profile' as Href)}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}>
            <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
          </Pressable>
        </View>

        <View style={styles.welcomePanel}>
          <Text style={styles.eyebrow}>Resident Dashboard</Text>
          <Text style={styles.welcome}>Welcome back, {residentFirstName}</Text>
          <Text style={styles.copy}>
            Stay informed, report local flood incidents, and track emergency response progress.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionEyebrow}>Incident Management</Text>
          <Text style={styles.panelTitle}>Flood response tools</Text>
          <Text style={styles.copy}>
            Report verified flood conditions and monitor the response status of your reports.
          </Text>
          <View style={styles.dashboardActions}>
            <DashboardAction
              accent="primary"
              description="Send verified flood details to support response teams."
              mark="!"
              symbolName="exclamationmark.triangle.fill"
              title="Report Flood Incident"
              variant="primary"
              onPress={() => router.push('/incidents/report' as Href)}
            />
            <DashboardAction
              accent="secondary"
              description="Review your submitted reports and current status."
              mark="R"
              symbolName="clock.arrow.circlepath"
              title="My Incident Reports"
              variant="secondary"
              onPress={() => router.push('/incidents' as Href)}
            />
          </View>
        </View>
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
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  topHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  brandBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  logo: {
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    height: 48,
    width: 48,
  },
  brandName: {
    color: BrandColors.white,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  headerGreeting: {
    color: BrandColors.sky,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  avatarButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.sky,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  welcomePanel: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionEyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  welcome: {
    color: BrandColors.navy,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  panelTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  copy: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  dashboardActions: {
    gap: 10,
    marginTop: 6,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 74,
    padding: 14,
  },
  primaryAction: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  secondaryAction: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
  },
  actionMark: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionMarkEmergency: {
    backgroundColor: BrandColors.red,
  },
  actionMarkStandard: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderWidth: 1,
  },
  actionMarkText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  actionMarkTextEmergency: {
    color: BrandColors.white,
  },
  actionMarkTextStandard: {
    color: BrandColors.deepBlue,
  },
  actionTextBlock: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  primaryActionTitle: {
    color: BrandColors.white,
  },
  actionDescription: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  primaryActionDescription: {
    color: BrandColors.sky,
  },
  actionArrow: {
    color: BrandColors.deepBlue,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  primaryActionArrow: {
    color: BrandColors.white,
  },
  pressed: {
    opacity: 0.72,
  },
});
