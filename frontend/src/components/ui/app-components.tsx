import { Image } from 'expo-image';
import { type Href, usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import resq1Logo from '@/assets/images/resq1-logo.jfif';
import { colors, radius, shadows, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { isAuthorityRole } from '@/utils/format';

type SymbolName = string;

type Tone = 'navy' | 'blue' | 'red' | 'green' | 'amber' | 'muted';

const toneStyles: Record<Tone, { backgroundColor: string; borderColor: string; color: string }> = {
  navy: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.primaryAction,
    color: colors.onPrimary,
  },
  blue: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    color: colors.deepBlue,
  },
  red: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
    color: colors.red,
  },
  green: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
    color: colors.success,
  },
  amber: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.warningBorder,
    color: colors.amberText,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    color: colors.muted,
  },
};

export function AppIcon({
  fallback,
  name,
  size = 20,
  tintColor = colors.deepBlue,
}: {
  fallback: string;
  name: SymbolName;
  size?: number;
  tintColor?: string;
}) {
  const iconName = String(name);

  if (iconName.includes('chevron.left')) {
    return <ChevronLeftIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('bell')) {
    return <BellIcon size={size} tintColor={tintColor} waves={iconName.includes('waves')} />;
  }

  if (iconName.includes('house.and.flag')) {
    return <ShelterIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('flag')) {
    return <FlagIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('house')) {
    return <HomeIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('person')) {
    return <PersonIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('magnifyingglass')) {
    return <SearchIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('exclamationmark.triangle')) {
    return <WarningIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('cross.case')) {
    return <MedicalIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('gauge')) {
    return <GaugeIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('clock')) {
    return <ClockIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('arrow.down')) {
    return <DownloadIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('bookmark')) {
    return <BookmarkIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('gear')) {
    return <GearIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('moon')) {
    return <MoonIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('sun')) {
    return <SunIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('slider')) {
    return <SliderIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('pencil')) {
    return <PencilIcon size={size} tintColor={tintColor} />;
  }

  if (iconName.includes('trash')) {
    return <TrashIcon size={size} tintColor={tintColor} />;
  }

  return (
    <Text style={[styles.iconFallback, { color: tintColor, fontSize: Math.max(12, size * 0.55) }]}>
      {fallback}
    </Text>
  );
}

function IconCanvas({ children, size }: { children: ReactNode; size: number }) {
  return <View style={[styles.iconCanvas, { height: size, width: size }]}>{children}</View>;
}

function BellIcon({ size, tintColor, waves = false }: { size: number; tintColor: string; waves?: boolean }) {
  return (
    <IconCanvas size={size}>
      {waves ? (
        <>
          <View style={[styles.bellWaveLeft, { borderColor: tintColor }]} />
          <View style={[styles.bellWaveRight, { borderColor: tintColor }]} />
        </>
      ) : null}
      <View style={[styles.bellBody, { borderColor: tintColor }]} />
      <View style={[styles.bellBase, { backgroundColor: tintColor }]} />
      <View style={[styles.bellClapper, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function PersonIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.personHead, { borderColor: tintColor }]} />
      <View style={[styles.personBody, { borderColor: tintColor }]} />
    </IconCanvas>
  );
}

function HomeIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.homeRoof, { borderColor: tintColor }]} />
      <View style={[styles.homeBase, { borderColor: tintColor }]} />
      <View style={[styles.homeDoor, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function ShelterIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.homeRoof, { borderColor: tintColor }]} />
      <View style={[styles.homeBase, { borderColor: tintColor }]} />
      <View style={[styles.shelterPole, { backgroundColor: tintColor }]} />
      <View style={[styles.shelterFlag, { borderColor: tintColor }]} />
    </IconCanvas>
  );
}

function FlagIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.flagPole, { backgroundColor: tintColor }]} />
      <View style={[styles.flagBanner, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function WarningIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.warningDiamond, { borderColor: tintColor }]} />
      <Text style={[styles.warningMark, { color: tintColor, fontSize: Math.max(12, size * 0.58) }]}>!</Text>
    </IconCanvas>
  );
}

function SearchIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.searchCircle, { borderColor: tintColor }]} />
      <View style={[styles.searchHandle, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function ChevronLeftIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.chevronLineTop, { backgroundColor: tintColor }]} />
      <View style={[styles.chevronLineBottom, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function MedicalIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.medicalCase, { borderColor: tintColor }]} />
      <View style={[styles.medicalHandle, { borderColor: tintColor }]} />
      <View style={[styles.medicalCrossVertical, { backgroundColor: tintColor }]} />
      <View style={[styles.medicalCrossHorizontal, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function GaugeIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.gaugeArc, { borderColor: tintColor }]} />
      <View style={[styles.gaugeNeedle, { backgroundColor: tintColor }]} />
      <View style={[styles.gaugeDot, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function ClockIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.clockCircle, { borderColor: tintColor }]} />
      <View style={[styles.clockHandHour, { backgroundColor: tintColor }]} />
      <View style={[styles.clockHandMinute, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function DownloadIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.downloadCircle, { borderColor: tintColor }]} />
      <View style={[styles.downloadShaft, { backgroundColor: tintColor }]} />
      <View style={[styles.downloadArrowLeft, { backgroundColor: tintColor }]} />
      <View style={[styles.downloadArrowRight, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function BookmarkIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.bookmarkBody, { borderColor: tintColor }]} />
      <View style={[styles.bookmarkPointLeft, { backgroundColor: tintColor }]} />
      <View style={[styles.bookmarkPointRight, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function GearIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.gearToothVertical, { backgroundColor: tintColor }]} />
      <View style={[styles.gearToothHorizontal, { backgroundColor: tintColor }]} />
      <View style={[styles.gearToothDiagonalLeft, { backgroundColor: tintColor }]} />
      <View style={[styles.gearToothDiagonalRight, { backgroundColor: tintColor }]} />
      <View style={[styles.gearRing, { backgroundColor: colors.white, borderColor: tintColor }]} />
      <View style={[styles.gearCenter, { borderColor: tintColor }]} />
    </IconCanvas>
  );
}

function MoonIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.moonDisc, { borderColor: tintColor }]} />
      <View style={styles.moonCutout} />
    </IconCanvas>
  );
}

function SunIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.sunDisc, { borderColor: tintColor }]} />
      <View style={[styles.sunRayVertical, { backgroundColor: tintColor }]} />
      <View style={[styles.sunRayHorizontal, { backgroundColor: tintColor }]} />
      <View style={[styles.sunRayDiagonalLeft, { backgroundColor: tintColor }]} />
      <View style={[styles.sunRayDiagonalRight, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function SliderIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.sliderLineTop, { backgroundColor: tintColor }]} />
      <View style={[styles.sliderLineMiddle, { backgroundColor: tintColor }]} />
      <View style={[styles.sliderLineBottom, { backgroundColor: tintColor }]} />
      <View style={[styles.sliderKnobLeft, { borderColor: tintColor }]} />
      <View style={[styles.sliderKnobRight, { borderColor: tintColor }]} />
      <View style={[styles.sliderKnobCenter, { borderColor: tintColor }]} />
    </IconCanvas>
  );
}

function PencilIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.pencilBody, { backgroundColor: tintColor }]} />
      <View style={styles.pencilWood} />
      <View style={styles.pencilLead} />
      <View style={[styles.pencilEraser, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

function TrashIcon({ size, tintColor }: { size: number; tintColor: string }) {
  return (
    <IconCanvas size={size}>
      <View style={[styles.trashLid, { backgroundColor: tintColor }]} />
      <View style={[styles.trashHandle, { borderColor: tintColor }]} />
      <View style={[styles.trashBody, { borderColor: tintColor }]} />
      <View style={[styles.trashLineLeft, { backgroundColor: tintColor }]} />
      <View style={[styles.trashLineRight, { backgroundColor: tintColor }]} />
    </IconCanvas>
  );
}

export function ScreenContainer({
  children,
  bottomNav = true,
  scroll = true,
  statusBar = 'dark',
}: {
  children: ReactNode;
  bottomNav?: boolean;
  scroll?: boolean;
  statusBar?: 'dark' | 'light';
}) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={statusBar === 'light' || theme === 'dark' ? 'light' : 'dark'} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, bottomNav && styles.contentWithBottomNav]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.staticContent, bottomNav && styles.staticContentWithBottomNav]}>
          {children}
        </View>
      )}
      {bottomNav ? <BottomNavigation /> : null}
    </SafeAreaView>
  );
}

export function LoadingState({ message = 'Loading ResQ1 data...' }: { message?: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.red} size="large" />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  action,
  body,
  title,
}: {
  action?: ReactNode;
  body: string;
  title: string;
}) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      {action}
    </View>
  );
}

export function AppHeader({
  action,
  eyebrow,
  onBack,
  subtitle,
  title,
}: {
  action?: ReactNode;
  eyebrow?: string;
  onBack?: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.headerShell}>
      {onBack || action ? (
        <View style={styles.headerTopRow}>
          {onBack ? (
            <IconButton
              accessibilityLabel="Back"
              fallback="<"
              name="chevron.left"
              onPress={onBack}
            />
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      <View style={styles.headerTextBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function HomeHeader({
  greeting,
  onNotifications,
}: {
  greeting: string;
  onNotifications: () => void;
}) {
  return (
    <View style={styles.homeHeader}>
      <View style={styles.homeBrandBlock}>
        <View style={styles.wordmark}>
          <Image contentFit="contain" source={resq1Logo} style={styles.wordmarkLogo} />
        </View>
        <View style={styles.homeGreetingBlock}>
          <Text style={styles.wordmarkName}>ResQ1</Text>
          <Text style={styles.homeGreeting}>{greeting}</Text>
        </View>
      </View>
      <View style={styles.homeHeaderActions}>
        <IconButton
          accessibilityLabel="Open alert preferences"
          fallback="N"
          name="bell.fill"
          onPress={onNotifications}
        />
      </View>
    </View>
  );
}

export function SectionCard({
  children,
  title,
  subtitle,
  tone = 'white',
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  tone?: 'white' | 'navy' | 'blue' | 'danger';
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        tone === 'navy' && styles.sectionCardNavy,
        tone === 'blue' && styles.sectionCardBlue,
        tone === 'danger' && styles.sectionCardDanger,
      ]}>
      {title || subtitle ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text style={[styles.sectionTitle, tone === 'navy' && styles.sectionTitleOnDark]}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.sectionSubtitle, tone === 'navy' && styles.sectionSubtitleOnDark]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function PrimaryButton({
  disabled = false,
  loading = false,
  onPress,
  title,
  tone = 'navy',
}: {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  title: string;
  tone?: 'navy' | 'red';
}) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        tone === 'red' && styles.primaryButtonRed,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  disabled = false,
  onPress,
  title,
}: {
  disabled?: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  accessibilityLabel,
  fallback,
  name,
  onPress,
  size = 44,
}: {
  accessibilityLabel: string;
  fallback: string;
  name: SymbolName;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { borderRadius: Math.min(radius.md, size / 2), height: size, width: size },
        pressed && styles.pressed,
      ]}>
      <AppIcon fallback={fallback} name={name} size={20} />
    </Pressable>
  );
}

export function ThemeToggleButton({ size = 44 }: { size?: number }) {
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';

  return (
    <Pressable
      accessibilityHint={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      accessibilityLabel={`${isDark ? 'Light' : 'Dark'} mode`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.iconButton,
        { borderRadius: Math.min(radius.md, size / 2), height: size, width: size },
        pressed && styles.pressed,
      ]}>
      <AppIcon
        fallback={isDark ? 'S' : 'M'}
        name={isDark ? 'sun.max.fill' : 'moon.fill'}
        size={20}
        tintColor={colors.deepBlue}
      />
    </Pressable>
  );
}

export function QuickActionCard({
  body,
  fallback,
  name,
  onPress,
  title,
  tone = 'blue',
}: {
  body: string;
  fallback: string;
  name: SymbolName;
  onPress: () => void;
  title: string;
  tone?: Tone;
}) {
  const toneStyle = toneStyles[tone];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <View
        style={[
          styles.quickIcon,
          { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor },
        ]}>
        <AppIcon fallback={fallback} name={name} size={22} tintColor={toneStyle.color} />
      </View>
      <View style={styles.quickTextBlock}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickBody}>{body}</Text>
      </View>
    </Pressable>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function StatusBadge({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: Tone;
}) {
  const toneStyle = toneStyles[tone];

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor },
      ]}>
      <Text style={[styles.statusBadgeText, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

export function SearchBar({
  placeholder,
  ...props
}: TextInputProps & {
  placeholder: string;
}) {
  return (
    <View style={styles.searchShell}>
      <AppIcon fallback="S" name="magnifyingglass" size={18} tintColor={colors.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.blue}
        style={styles.searchInput}
        {...props}
      />
    </View>
  );
}

export function FilterChip({
  selected,
  title,
  onPress,
}: {
  selected: boolean;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{title}</Text>
    </Pressable>
  );
}

export function ToggleRow({
  locked = false,
  onToggle,
  subtitle,
  title,
  value,
}: {
  locked?: boolean;
  onToggle?: () => void;
  subtitle?: string;
  title: string;
  value: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: locked }}
      disabled={locked}
      onPress={onToggle}
      style={({ pressed }) => [styles.toggleRow, pressed && !locked && styles.pressed]}>
      <View style={styles.toggleTextBlock}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn, locked && styles.toggleLocked]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </View>
    </Pressable>
  );
}

export function SegmentedOptions<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <View style={styles.segmentedShell}>
      {options.map((option) => {
        const selected = option === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.segmentedOption,
              selected && styles.segmentedOptionSelected,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.segmentedText, selected && styles.segmentedTextSelected]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DemoNotice({ text }: { text: string }) {
  return (
    <View style={styles.demoNotice}>
      <StatusBadge label="FRONTEND ONLY" tone="amber" />
      <Text style={styles.demoNoticeText}>{text}</Text>
    </View>
  );
}

const residentTabs = [
  {
    label: 'Home',
    route: '/dashboard' as Href,
    match: ['/dashboard'],
    icon: 'house.fill' as SymbolName,
    fallback: 'H',
  },
  {
    label: 'Alerts',
    route: '/alerts' as Href,
    match: ['/alerts', '/community-notifications'],
    icon: 'bell.fill' as SymbolName,
    fallback: 'A',
  },
  {
    label: 'Report',
    route: '/incidents' as Href,
    match: ['/incidents'],
    icon: 'exclamationmark.triangle.fill' as SymbolName,
    fallback: '!',
  },
  {
    label: 'Shelter',
    route: '/shelters' as Href,
    match: ['/shelters'],
    icon: 'house.and.flag.fill' as SymbolName,
    fallback: 'S',
  },
  {
    label: 'Profile',
    route: '/profile' as Href,
    match: ['/profile', '/settings', '/household', '/offline-safety'],
    icon: 'person.fill' as SymbolName,
    fallback: 'P',
  },
] as const;

const authorityTabs = [
  {
    label: 'Dashboard',
    route: '/dashboard' as Href,
    match: ['/dashboard'],
    icon: 'gauge.with.dots.needle.67percent' as SymbolName,
    fallback: 'D',
  },
  {
    label: 'Incidents',
    route: '/incidents' as Href,
    match: ['/incidents'],
    icon: 'exclamationmark.triangle.fill' as SymbolName,
    fallback: 'I',
  },
  {
    label: 'Alerts',
    route: '/alerts' as Href,
    match: ['/alerts', '/community-notifications'],
    icon: 'bell.fill' as SymbolName,
    fallback: 'A',
  },
  {
    label: 'Shelters',
    route: '/shelters' as Href,
    match: ['/shelters'],
    icon: 'house.and.flag.fill' as SymbolName,
    fallback: 'S',
  },
  {
    label: 'Profile',
    route: '/profile' as Href,
    match: ['/profile', '/settings'],
    icon: 'person.fill' as SymbolName,
    fallback: 'P',
  },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const tabs = isAuthorityRole(user?.role) ? authorityTabs : residentTabs;

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const active = tab.match.some((path) => pathname === path || pathname.startsWith(`${path}/`));

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={tab.label}
            onPress={() => {
              if (!active) {
                router.replace(tab.route);
              }
            }}
            style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
            <AppIcon
              fallback={tab.fallback}
              name={tab.icon}
              size={20}
              tintColor={active ? colors.navigationActive : colors.subtleText}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  iconCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBody: {
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 2,
    height: '56%',
    left: '25%',
    position: 'absolute',
    top: '18%',
    width: '50%',
  },
  bellBase: {
    borderRadius: 2,
    bottom: '20%',
    height: 2,
    left: '20%',
    position: 'absolute',
    width: '60%',
  },
  bellClapper: {
    borderRadius: 3,
    bottom: '10%',
    height: 5,
    position: 'absolute',
    width: 5,
  },
  bellWaveLeft: {
    borderLeftWidth: 2,
    borderRadius: 8,
    height: '42%',
    left: '6%',
    position: 'absolute',
    top: '20%',
    width: '18%',
  },
  bellWaveRight: {
    borderRadius: 8,
    borderRightWidth: 2,
    height: '42%',
    position: 'absolute',
    right: '6%',
    top: '20%',
    width: '18%',
  },
  personHead: {
    borderRadius: 999,
    borderWidth: 2,
    height: '34%',
    position: 'absolute',
    top: '13%',
    width: '34%',
  },
  personBody: {
    borderRadius: 999,
    borderTopWidth: 2,
    height: '42%',
    position: 'absolute',
    top: '56%',
    width: '68%',
  },
  homeRoof: {
    borderLeftWidth: 2,
    borderTopWidth: 2,
    height: '48%',
    position: 'absolute',
    top: '16%',
    transform: [{ rotate: '45deg' }],
    width: '48%',
  },
  homeBase: {
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    bottom: '14%',
    height: '43%',
    position: 'absolute',
    width: '54%',
  },
  homeDoor: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    bottom: '14%',
    height: '20%',
    position: 'absolute',
    width: '14%',
  },
  shelterPole: {
    height: '54%',
    position: 'absolute',
    right: '20%',
    top: '20%',
    width: 2,
  },
  shelterFlag: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: '22%',
    position: 'absolute',
    right: '6%',
    top: '18%',
    width: '26%',
  },
  flagPole: {
    borderRadius: 1,
    height: '78%',
    left: '20%',
    position: 'absolute',
    top: '12%',
    width: 2,
  },
  flagBanner: {
    borderBottomRightRadius: 3,
    borderTopRightRadius: 3,
    height: '46%',
    left: '28%',
    position: 'absolute',
    top: '14%',
    width: '58%',
  },
  warningDiamond: {
    borderRadius: 3,
    borderWidth: 2,
    height: '58%',
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: '58%',
  },
  warningMark: {
    fontWeight: '900',
    lineHeight: 18,
    position: 'absolute',
  },
  searchCircle: {
    borderRadius: 999,
    borderWidth: 2,
    height: '54%',
    left: '15%',
    position: 'absolute',
    top: '14%',
    width: '54%',
  },
  searchHandle: {
    borderRadius: 2,
    height: 2,
    position: 'absolute',
    right: '16%',
    top: '67%',
    transform: [{ rotate: '45deg' }],
    width: '31%',
  },
  chevronLineTop: {
    borderRadius: 2,
    height: 2,
    left: '30%',
    position: 'absolute',
    top: '35%',
    transform: [{ rotate: '-45deg' }],
    width: '42%',
  },
  chevronLineBottom: {
    borderRadius: 2,
    height: 2,
    left: '30%',
    position: 'absolute',
    top: '62%',
    transform: [{ rotate: '45deg' }],
    width: '42%',
  },
  medicalCase: {
    borderRadius: 4,
    borderWidth: 2,
    bottom: '16%',
    height: '58%',
    position: 'absolute',
    width: '72%',
  },
  medicalHandle: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderTopWidth: 2,
    height: '20%',
    position: 'absolute',
    top: '14%',
    width: '34%',
  },
  medicalCrossVertical: {
    borderRadius: 1,
    height: '30%',
    position: 'absolute',
    width: 2,
  },
  medicalCrossHorizontal: {
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    width: '30%',
  },
  gaugeArc: {
    borderBottomWidth: 0,
    borderRadius: 999,
    borderWidth: 2,
    bottom: '18%',
    height: '62%',
    position: 'absolute',
    width: '76%',
  },
  gaugeNeedle: {
    borderRadius: 2,
    bottom: '31%',
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-32deg' }],
    width: '34%',
  },
  gaugeDot: {
    borderRadius: 3,
    bottom: '27%',
    height: 6,
    position: 'absolute',
    width: 6,
  },
  clockCircle: {
    borderRadius: 999,
    borderWidth: 2,
    height: '74%',
    position: 'absolute',
    width: '74%',
  },
  clockHandHour: {
    borderRadius: 2,
    height: '25%',
    position: 'absolute',
    top: '28%',
    width: 2,
  },
  clockHandMinute: {
    borderRadius: 2,
    height: 2,
    left: '50%',
    position: 'absolute',
    top: '50%',
    width: '24%',
  },
  downloadCircle: {
    borderRadius: 999,
    borderWidth: 2,
    height: '82%',
    position: 'absolute',
    width: '82%',
  },
  downloadShaft: {
    borderRadius: 2,
    height: '38%',
    position: 'absolute',
    top: '20%',
    width: 2,
  },
  downloadArrowLeft: {
    borderRadius: 2,
    height: 2,
    left: '29%',
    position: 'absolute',
    top: '54%',
    transform: [{ rotate: '45deg' }],
    width: '24%',
  },
  downloadArrowRight: {
    borderRadius: 2,
    height: 2,
    position: 'absolute',
    right: '29%',
    top: '54%',
    transform: [{ rotate: '-45deg' }],
    width: '24%',
  },
  bookmarkBody: {
    borderBottomWidth: 0,
    borderRadius: 3,
    borderWidth: 2,
    height: '70%',
    position: 'absolute',
    top: '12%',
    width: '54%',
  },
  bookmarkPointLeft: {
    borderRadius: 2,
    bottom: '16%',
    height: 2,
    left: '26%',
    position: 'absolute',
    transform: [{ rotate: '38deg' }],
    width: '30%',
  },
  bookmarkPointRight: {
    borderRadius: 2,
    bottom: '16%',
    height: 2,
    position: 'absolute',
    right: '26%',
    transform: [{ rotate: '-38deg' }],
    width: '30%',
  },
  gearToothVertical: {
    borderRadius: 2,
    height: '100%',
    position: 'absolute',
    width: 3,
  },
  gearToothHorizontal: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    width: '100%',
  },
  gearToothDiagonalLeft: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: '92%',
  },
  gearToothDiagonalRight: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: '92%',
  },
  gearRing: {
    borderRadius: 999,
    borderWidth: 2,
    height: '62%',
    position: 'absolute',
    width: '62%',
  },
  gearCenter: {
    borderRadius: 999,
    borderWidth: 2,
    height: '22%',
    position: 'absolute',
    width: '22%',
  },
  moonDisc: {
    borderRadius: 999,
    borderWidth: 2,
    height: '72%',
    left: '12%',
    position: 'absolute',
    top: '14%',
    width: '72%',
  },
  moonCutout: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: '62%',
    position: 'absolute',
    right: '2%',
    top: '4%',
    width: '62%',
  },
  sunDisc: {
    borderRadius: 999,
    borderWidth: 2,
    height: '38%',
    position: 'absolute',
    width: '38%',
  },
  sunRayVertical: {
    borderRadius: 2,
    height: '100%',
    position: 'absolute',
    width: 2,
  },
  sunRayHorizontal: {
    borderRadius: 2,
    height: 2,
    position: 'absolute',
    width: '100%',
  },
  sunRayDiagonalLeft: {
    borderRadius: 2,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: '88%',
  },
  sunRayDiagonalRight: {
    borderRadius: 2,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: '88%',
  },
  sliderLineTop: {
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    top: '25%',
    width: '78%',
  },
  sliderLineMiddle: {
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    top: '50%',
    width: '78%',
  },
  sliderLineBottom: {
    borderRadius: 1,
    bottom: '25%',
    height: 2,
    position: 'absolute',
    width: '78%',
  },
  sliderKnobLeft: {
    backgroundColor: colors.onPrimary,
    borderRadius: 4,
    borderWidth: 2,
    height: 8,
    left: '22%',
    position: 'absolute',
    top: '18%',
    width: 8,
  },
  sliderKnobRight: {
    backgroundColor: colors.onPrimary,
    borderRadius: 4,
    borderWidth: 2,
    height: 8,
    position: 'absolute',
    right: '20%',
    top: '43%',
    width: 8,
  },
  sliderKnobCenter: {
    backgroundColor: colors.onPrimary,
    borderRadius: 4,
    borderWidth: 2,
    bottom: '18%',
    height: 8,
    position: 'absolute',
    width: 8,
  },
  pencilBody: {
    borderRadius: 2,
    height: 5,
    left: '28%',
    position: 'absolute',
    top: '45%',
    transform: [{ rotate: '-45deg' }],
    width: '46%',
  },
  pencilWood: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    borderLeftColor: colors.goldAccent,
    borderLeftWidth: 7,
    borderTopColor: 'transparent',
    borderTopWidth: 3,
    position: 'absolute',
    right: '18%',
    top: '32%',
    transform: [{ rotate: '-45deg' }],
  },
  pencilLead: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    borderLeftColor: colors.navy,
    borderLeftWidth: 4,
    borderTopColor: 'transparent',
    borderTopWidth: 2,
    position: 'absolute',
    right: '14%',
    top: '29%',
    transform: [{ rotate: '-45deg' }],
  },
  pencilEraser: {
    borderRadius: 1,
    height: 5,
    left: '20%',
    position: 'absolute',
    top: '62%',
    transform: [{ rotate: '-45deg' }],
    width: 6,
  },
  trashLid: {
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    top: '22%',
    width: '62%',
  },
  trashHandle: {
    borderBottomWidth: 0,
    borderRadius: 3,
    borderWidth: 2,
    height: '18%',
    position: 'absolute',
    top: '10%',
    width: '28%',
  },
  trashBody: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderTopWidth: 0,
    borderWidth: 2,
    bottom: '16%',
    height: '54%',
    position: 'absolute',
    width: '52%',
  },
  trashLineLeft: {
    borderRadius: 1,
    height: '34%',
    left: '40%',
    position: 'absolute',
    top: '40%',
    width: 2,
  },
  trashLineRight: {
    borderRadius: 1,
    height: '34%',
    position: 'absolute',
    right: '40%',
    top: '40%',
    width: 2,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  contentWithBottomNav: {
    paddingBottom: 96,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  staticContentWithBottomNav: {
    paddingBottom: 96,
  },
  headerShell: {
    gap: spacing.md,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTextBlock: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.red,
    ...typography.label,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.navy,
    ...typography.title,
  },
  subtitle: {
    color: colors.muted,
    ...typography.body,
  },
  homeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  homeBrandBlock: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wordmark: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    padding: 4,
    width: 44,
  },
  wordmarkLogo: {
    height: '100%',
    width: '100%',
  },
  wordmarkName: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
  },
  homeGreetingBlock: {
    flex: 1,
  },
  homeGreeting: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  homeHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  sectionCardNavy: {
    backgroundColor: colors.identitySurface,
    borderColor: colors.identityBorder,
  },
  sectionCardBlue: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
  },
  sectionCardDanger: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.navy,
    ...typography.sectionTitle,
  },
  sectionTitleOnDark: {
    color: colors.onPrimary,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  sectionSubtitleOnDark: {
    color: colors.onPrimaryMuted,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryAction,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonRed: {
    backgroundColor: colors.redAction,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    color: colors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconFallback: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  quickAction: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minHeight: 132,
    minWidth: '47%',
    padding: spacing.md,
  },
  quickIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  quickTextBlock: {
    gap: spacing.xs,
  },
  quickTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  quickBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  infoRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    ...typography.label,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  searchShell: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 46,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  filterChipSelected: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.primaryAction,
  },
  filterChipText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  filterChipTextSelected: {
    color: colors.onPrimary,
  },
  toggleRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 62,
    paddingVertical: spacing.md,
  },
  toggleTextBlock: {
    flex: 1,
    gap: 3,
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  toggleSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  toggleTrack: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 50,
  },
  toggleTrackOn: {
    backgroundColor: colors.successBorder,
    borderColor: colors.successBorder,
  },
  toggleLocked: {
    opacity: 0.75,
  },
  toggleKnob: {
    backgroundColor: colors.onPrimary,
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  segmentedShell: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  segmentedOption: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: '45%',
    paddingHorizontal: spacing.md,
  },
  segmentedOptionSelected: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.primaryAction,
  },
  segmentedText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  segmentedTextSelected: {
    color: colors.onPrimary,
  },
  demoNotice: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  demoNoticeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 220,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  stateText: {
    color: colors.muted,
    ...typography.body,
    textAlign: 'center',
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
    left: spacing.md,
    padding: spacing.xs,
    position: 'absolute',
    right: spacing.md,
    ...shadows.card,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 2,
  },
  tabLabel: {
    color: colors.subtleText,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
  },
  tabLabelActive: {
    color: colors.navigationActive,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.72,
  },
});
