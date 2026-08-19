import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppIcon,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui/app-components';
import { colors, radius, spacing, typography } from '@/constants/design';
import { completeOnboarding } from '@/services/onboardingService';

const pages = [
  {
    title: 'Stay Ahead of Disasters',
    text: 'Receive verified flood and emergency alerts before conditions become dangerous.',
    fallback: 'A',
    icon: 'bell.and.waves.left.and.right.fill',
  },
  {
    title: 'Report What You See',
    text: 'Share verified incident information to help emergency teams respond faster.',
    fallback: 'R',
    icon: 'exclamationmark.triangle.fill',
  },
  {
    title: 'Reach Safety Faster',
    text: 'Find safe shelters, evacuation routes, and emergency support when you need them.',
    fallback: 'S',
    icon: 'house.and.flag.fill',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const page = pages[index];
  const lastPage = index === pages.length - 1;

  const finish = async () => {
    await completeOnboarding();
    router.replace('/auth/welcome' as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>ResQ1</Text>
          <Pressable
            accessibilityRole="button"
            onPress={finish}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.visual}>
          <View style={styles.ringOuter}>
            <View style={styles.ringMiddle}>
              <View style={styles.iconShell}>
                <AppIcon
                  fallback={page.fallback}
                  name={page.icon}
                  size={58}
                  tintColor={colors.white}
                />
              </View>
            </View>
          </View>
          <View style={styles.visualLine} />
          <View style={styles.visualStats}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>24/7</Text>
              <Text style={styles.statLabel}>Verified Monitoring</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>Local</Text>
              <Text style={styles.statLabel}>Response Network</Text>
            </View>
          </View>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>{page.title}</Text>
          <Text style={styles.text}>{page.text}</Text>
        </View>

        <View style={styles.indicators}>
          {pages.map((item, pageIndex) => (
            <View
              key={item.title}
              style={[styles.indicator, pageIndex === index && styles.indicatorActive]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {lastPage ? (
            <PrimaryButton title="Get Started" onPress={finish} />
          ) : (
            <>
              <PrimaryButton title="Next" onPress={() => setIndex((current) => current + 1)} />
              <SecondaryButton title="Skip to Welcome" onPress={finish} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    color: colors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  visual: {
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  ringOuter: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    height: 210,
    justifyContent: 'center',
    width: '100%',
  },
  ringMiddle: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    height: 156,
    justifyContent: 'center',
    width: 156,
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    height: 106,
    justifyContent: 'center',
    width: 106,
  },
  visualLine: {
    backgroundColor: colors.red,
    borderRadius: radius.xs,
    height: 4,
    width: 64,
  },
  visualStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  statPill: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    padding: spacing.md,
  },
  statValue: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  copyBlock: {
    gap: spacing.sm,
  },
  title: {
    color: colors.navy,
    ...typography.title,
    textAlign: 'center',
  },
  text: {
    color: colors.muted,
    ...typography.body,
    textAlign: 'center',
  },
  indicators: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  indicator: {
    backgroundColor: colors.border,
    borderRadius: radius.xs,
    height: 8,
    width: 18,
  },
  indicatorActive: {
    backgroundColor: colors.red,
    width: 32,
  },
  actions: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
