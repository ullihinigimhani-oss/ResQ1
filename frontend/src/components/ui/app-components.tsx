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

import { colors, radius, shadows, spacing, typography } from '@/constants/design';

type SymbolName = string;

type Tone = 'navy' | 'blue' | 'red' | 'green' | 'amber' | 'muted';

const toneStyles: Record<Tone, { backgroundColor: string; borderColor: string; color: string }> = {
  navy: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
    color: colors.white,
  },
  blue: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    color: colors.deepBlue,
  },
  red: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    color: colors.red,
  },
  green: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    color: colors.success,
  },
  amber: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amber,
    color: '#7A4B00',
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

  if (iconName.includes('slider')) {
    return <SliderIcon size={size} tintColor={tintColor} />;
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
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={statusBar} />
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
  onProfile,
  userName,
}: {
  greeting: string;
  onNotifications: () => void;
  onProfile: () => void;
  userName: string;
}) {
  return (
    <View style={styles.homeHeader}>
      <View style={styles.homeBrandBlock}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkText}>R1</Text>
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
        <Pressable
          accessibilityLabel={`Open profile for ${userName}`}
          accessibilityRole="button"
          onPress={onProfile}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
          <AppIcon fallback="P" name="person.fill" size={22} tintColor={colors.navy} />
        </Pressable>
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
        <ActivityIndicator color={colors.white} />
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
}: {
  accessibilityLabel: string;
  fallback: string;
  name: SymbolName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <AppIcon fallback={fallback} name={name} size={20} />
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
        placeholderTextColor="#8B98A9"
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

const tabs = [
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
    match: ['/alerts'],
    icon: 'bell.fill' as SymbolName,
    fallback: 'A',
  },
  {
    label: 'Report',
    route: '/incidents/report' as Href,
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
    match: ['/profile', '/settings', '/household'],
    icon: 'person.fill' as SymbolName,
    fallback: 'P',
  },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const active = tab.match.some((path) => pathname === path || pathname.startsWith(`${path}/`));

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={tab.label}
            onPress={() => router.replace(tab.route)}
            style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
            <AppIcon
              fallback={tab.fallback}
              name={tab.icon}
              size={20}
              tintColor={active ? colors.red : colors.muted}
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
    backgroundColor: colors.white,
    borderRadius: 4,
    borderWidth: 2,
    height: 8,
    left: '22%',
    position: 'absolute',
    top: '18%',
    width: 8,
  },
  sliderKnobRight: {
    backgroundColor: colors.white,
    borderRadius: 4,
    borderWidth: 2,
    height: 8,
    position: 'absolute',
    right: '20%',
    top: '43%',
    width: 8,
  },
  sliderKnobCenter: {
    backgroundColor: colors.white,
    borderRadius: 4,
    borderWidth: 2,
    bottom: '18%',
    height: 8,
    position: 'absolute',
    width: 8,
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
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  wordmarkText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
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
    backgroundColor: colors.navy,
    borderColor: colors.deepBlue,
  },
  sectionCardBlue: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
  },
  sectionCardDanger: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.navy,
    ...typography.sectionTitle,
  },
  sectionTitleOnDark: {
    color: colors.white,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  sectionSubtitleOnDark: {
    color: colors.sky,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonRed: {
    backgroundColor: colors.red,
  },
  primaryButtonText: {
    color: colors.white,
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  filterChipTextSelected: {
    color: colors.white,
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
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  toggleLocked: {
    opacity: 0.75,
  },
  toggleKnob: {
    backgroundColor: colors.white,
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
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  segmentedText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  segmentedTextSelected: {
    color: colors.white,
  },
  demoNotice: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amber,
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
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
  },
  tabLabelActive: {
    color: colors.red,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.72,
  },
});
