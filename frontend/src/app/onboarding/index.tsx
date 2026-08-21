import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import resq1Logo from '@/assets/images/resq1-logo.jfif';
import { AppIcon } from '@/components/ui/app-components';
import { colors, radius, shadows, spacing } from '@/constants/design';

type OnboardingPage = {
  accent: string;
  description: string;
  fallback: string;
  icon: string;
  kicker: string;
  metric: string;
  title: string;
  variant: 'alert' | 'report' | 'shelter';
};

const onboardingPages: OnboardingPage[] = [
  {
    accent: colors.red,
    description: 'Receive verified flood and disaster warnings for your area before conditions become dangerous.',
    fallback: 'A',
    icon: 'bell.and.waves.left.and.right.fill',
    kicker: 'Verified early warnings',
    metric: 'Area alerts',
    title: 'Stay Informed. Stay Safe.',
    variant: 'alert',
  },
  {
    accent: colors.deepBlue,
    description: 'Share ground-level incident information, location and evidence to help emergency teams respond faster.',
    fallback: 'R',
    icon: 'exclamationmark.triangle.fill',
    kicker: 'Fast incident reporting',
    metric: 'Location + evidence',
    title: 'Report Emergencies Quickly',
    variant: 'report',
  },
  {
    accent: colors.success,
    description: 'Find nearby safe shelters, evacuation information and emergency assistance when you need it most.',
    fallback: 'S',
    icon: 'house.and.flag.fill',
    kicker: 'Shelter and evacuation',
    metric: 'Nearest safe route',
    title: 'Reach Safety with Confidence',
    variant: 'shelter',
  },
];

function AlertIllustration() {
  return (
    <>
      <View style={styles.signalMast} />
      <View style={styles.signalBase} />
      <View style={[styles.signalWave, styles.signalWaveOne]} />
      <View style={[styles.signalWave, styles.signalWaveTwo]} />
      <View style={styles.floodBand}>
        <View style={styles.floodLine} />
        <View style={[styles.floodLine, styles.floodLineShort]} />
      </View>
    </>
  );
}

function ReportIllustration() {
  return (
    <>
      <View style={styles.phoneFrame}>
        <View style={styles.phoneTopLine} />
        <View style={styles.phoneField} />
        <View style={[styles.phoneField, styles.phoneFieldShort]} />
      </View>
      <View style={styles.locationPin}>
        <View style={styles.locationPinCore} />
      </View>
      <View style={styles.evidenceCard}>
        <View style={styles.evidenceDot} />
        <View style={styles.evidenceLine} />
      </View>
    </>
  );
}

function ShelterIllustration() {
  return (
    <>
      <View style={styles.routeLine} />
      <View style={[styles.routePoint, styles.routePointStart]} />
      <View style={[styles.routePoint, styles.routePointEnd]} />
      <View style={styles.shelterHouse}>
        <View style={styles.shelterRoof} />
        <View style={styles.shelterDoor} />
      </View>
      <View style={styles.safeZone}>
        <Text style={styles.safeZoneText}>SAFE</Text>
      </View>
    </>
  );
}

function OnboardingVisual({ page }: { page: OnboardingPage }) {
  return (
    <View style={styles.visualCard}>
      <View style={styles.visualGrid}>
        <View style={[styles.gridLine, styles.gridLineTop]} />
        <View style={[styles.gridLine, styles.gridLineMiddle]} />
        <View style={[styles.gridLine, styles.gridLineBottom]} />
        <View style={[styles.gridColumn, styles.gridColumnLeft]} />
        <View style={[styles.gridColumn, styles.gridColumnRight]} />
      </View>

      {page.variant === 'alert' ? <AlertIllustration /> : null}
      {page.variant === 'report' ? <ReportIllustration /> : null}
      {page.variant === 'shelter' ? <ShelterIllustration /> : null}

      <View style={[styles.iconTile, { borderColor: page.accent }]}>
        <AppIcon fallback={page.fallback} name={page.icon} size={46} tintColor={page.accent} />
      </View>

      <View style={styles.metricPill}>
        <View style={[styles.metricAccent, { backgroundColor: page.accent }]} />
        <Text style={styles.metricText}>{page.metric}</Text>
      </View>
    </View>
  );
}

function ProgressIndicator({ currentIndex }: { currentIndex: number }) {
  return (
    <View accessibilityLabel={`Onboarding step ${currentIndex + 1} of 3`} style={styles.progressRow}>
      {onboardingPages.map((page, index) => (
        <View
          key={page.title}
          style={[styles.progressStep, index === currentIndex && styles.progressStepActive]}
        />
      ))}
    </View>
  );
}

function NavButton({
  kind,
  onPress,
  title,
}: {
  kind: 'primary' | 'secondary';
  onPress: () => void;
  title: string;
}) {
  const primary = kind === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        primary ? styles.navButtonPrimary : styles.navButtonSecondary,
        pressed && styles.pressed,
      ]}>
      <Text style={primary ? styles.navButtonPrimaryText : styles.navButtonSecondaryText}>{title}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPage = onboardingPages[currentIndex];
  const isFirstPage = currentIndex === 0;
  const isLastPage = currentIndex === onboardingPages.length - 1;

  const openWelcome = () => {
    router.replace('/auth/welcome' as Href);
  };

  const goBack = () => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  };

  const goNext = () => {
    if (isLastPage) {
      openWelcome();
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, onboardingPages.length - 1));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoShell}>
              <Image contentFit="contain" source={resq1Logo} style={styles.logo} />
            </View>
            <View>
              <Text style={styles.brandName}>ResQ1</Text>
              <Text style={styles.brandLabel}>Disaster readiness</Text>
            </View>
          </View>
          <Text style={styles.stepLabel}>{String(currentIndex + 1).padStart(2, '0')} / 03</Text>
        </View>

        <ProgressIndicator currentIndex={currentIndex} />

        <OnboardingVisual page={currentPage} />

        <View style={styles.copyBlock}>
          <Text style={[styles.kicker, { color: currentPage.accent }]}>{currentPage.kicker}</Text>
          <Text style={styles.title}>{currentPage.title}</Text>
          <Text style={styles.description}>{currentPage.description}</Text>
        </View>

        <View style={styles.actions}>
          <NavButton kind="secondary" title={isFirstPage ? 'Skip' : 'Back'} onPress={isFirstPage ? openWelcome : goBack} />
          <NavButton kind="primary" title={isLastPage ? 'Get Started' : 'Next'} onPress={goNext} />
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
    gap: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logoShell: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    padding: 5,
    width: 44,
  },
  logo: {
    height: '100%',
    width: '100%',
  },
  brandName: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  brandLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  stepLabel: {
    color: colors.deepBlue,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressStep: {
    backgroundColor: colors.border,
    borderRadius: radius.xs,
    flex: 1,
    height: 7,
  },
  progressStepActive: {
    backgroundColor: colors.red,
  },
  visualCard: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 250,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  visualGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  gridLine: {
    backgroundColor: colors.sky,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  gridLineTop: {
    top: 58,
  },
  gridLineMiddle: {
    top: 126,
  },
  gridLineBottom: {
    top: 194,
  },
  gridColumn: {
    backgroundColor: colors.sky,
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  gridColumnLeft: {
    left: '32%',
  },
  gridColumnRight: {
    right: '27%',
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    height: 96,
    justifyContent: 'center',
    left: 24,
    position: 'absolute',
    top: 24,
    width: 96,
  },
  metricPill: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: 20,
    flexDirection: 'row',
    gap: spacing.sm,
    left: 20,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    position: 'absolute',
  },
  metricAccent: {
    borderRadius: radius.xs,
    height: 22,
    width: 4,
  },
  metricText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  signalMast: {
    backgroundColor: colors.navy,
    borderRadius: radius.xs,
    bottom: 70,
    height: 84,
    position: 'absolute',
    right: 72,
    width: 8,
  },
  signalBase: {
    backgroundColor: colors.navy,
    borderRadius: radius.xs,
    bottom: 62,
    height: 8,
    position: 'absolute',
    right: 52,
    width: 48,
  },
  signalWave: {
    borderColor: colors.red,
    borderRadius: 80,
    borderRightWidth: 3,
    borderTopWidth: 3,
    position: 'absolute',
    transform: [{ rotate: '38deg' }],
  },
  signalWaveOne: {
    height: 42,
    right: 42,
    top: 42,
    width: 42,
  },
  signalWaveTwo: {
    height: 70,
    right: 28,
    top: 28,
    width: 70,
  },
  floodBand: {
    backgroundColor: colors.white,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: 24,
    gap: 6,
    padding: spacing.md,
    position: 'absolute',
    right: 20,
    width: 132,
  },
  floodLine: {
    backgroundColor: colors.blue,
    borderRadius: radius.xs,
    height: 5,
    width: '100%',
  },
  floodLineShort: {
    opacity: 0.55,
    width: '72%',
  },
  phoneFrame: {
    backgroundColor: colors.white,
    borderColor: colors.navy,
    borderRadius: radius.md,
    borderWidth: 2,
    height: 142,
    padding: spacing.md,
    position: 'absolute',
    right: 34,
    top: 34,
    width: 92,
  },
  phoneTopLine: {
    backgroundColor: colors.border,
    borderRadius: radius.xs,
    height: 5,
    marginBottom: spacing.md,
    width: '62%',
  },
  phoneField: {
    backgroundColor: colors.lightBlue,
    borderRadius: radius.sm,
    height: 28,
    marginBottom: spacing.sm,
  },
  phoneFieldShort: {
    width: '72%',
  },
  locationPin: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 104,
    top: 104,
    transform: [{ rotate: '45deg' }],
    width: 44,
  },
  locationPinCore: {
    backgroundColor: colors.white,
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  evidenceCard: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    bottom: 26,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    position: 'absolute',
    right: 30,
    width: 132,
  },
  evidenceDot: {
    backgroundColor: colors.white,
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  evidenceLine: {
    backgroundColor: colors.sky,
    borderRadius: radius.xs,
    flex: 1,
    height: 5,
  },
  routeLine: {
    backgroundColor: colors.deepBlue,
    borderRadius: radius.xs,
    height: 5,
    position: 'absolute',
    right: 42,
    top: 128,
    transform: [{ rotate: '-24deg' }],
    width: 166,
  },
  routePoint: {
    backgroundColor: colors.white,
    borderColor: colors.deepBlue,
    borderRadius: 13,
    borderWidth: 4,
    height: 26,
    position: 'absolute',
    width: 26,
  },
  routePointStart: {
    right: 170,
    top: 150,
  },
  routePointEnd: {
    right: 38,
    top: 92,
  },
  shelterHouse: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 2,
    height: 88,
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
    position: 'absolute',
    right: 26,
    top: 40,
    width: 98,
  },
  shelterRoof: {
    borderBottomColor: colors.success,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderLeftWidth: 40,
    borderRightColor: 'transparent',
    borderRightWidth: 40,
    height: 0,
    position: 'absolute',
    top: -22,
    width: 0,
  },
  shelterDoor: {
    backgroundColor: colors.success,
    borderRadius: radius.xs,
    height: 30,
    width: 22,
  },
  safeZone: {
    backgroundColor: colors.white,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: 28,
  },
  safeZoneText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  copyBlock: {
    gap: spacing.sm,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.navy,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 33,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  navButtonPrimary: {
    backgroundColor: colors.navy,
  },
  navButtonSecondary: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  },
  navButtonPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  navButtonSecondaryText: {
    color: colors.deepBlue,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
