import { DynamicColorIOS, Platform, PlatformColor } from 'react-native';

function androidColorFallbacks(variable: string): string[] {
  if (
    variable.endsWith('-soft')
    || variable.startsWith('surface-')
    || variable === 'background-secondary'
    || variable === 'control-surface-subtle'
    || variable === 'primary-muted'
    || variable === 'neutral-soft'
    || variable === 'chart-surface'
    || variable === 'map-overlay'
  ) {
    return ['?android:attr/colorBackgroundFloating', '?android:attr/colorBackground'];
  }

  if (variable === 'background') {
    return ['?android:attr/colorBackground'];
  }

  if (variable === 'surface' || variable === 'surface-elevated' || variable === 'control-surface') {
    return ['?android:attr/colorBackgroundFloating', '?android:attr/colorBackground'];
  }

  if (variable === 'text-strong' || variable === 'text' || variable === 'route-alternate') {
    return ['?android:attr/colorForeground', '@android:color/black'];
  }

  if (
    variable === 'text-muted'
    || variable === 'text-subtle'
    || variable === 'placeholder'
    || variable === 'slate'
  ) {
    return ['?android:attr/colorForeground', '@android:color/black'];
  }

  if (variable === 'on-primary' || variable === 'on-primary-muted' || variable === 'critical-text') {
    return ['@android:color/white'];
  }

  if (variable === 'border' || variable === 'switch-track') {
    return ['?android:attr/colorForeground', '@android:color/black'];
  }

  if (variable === 'switch-thumb') {
    return ['?android:attr/colorForeground', '@android:color/black'];
  }

  if (variable.includes('success') || variable === 'route-safe' || variable === 'safe-bright') {
    return ['@android:color/holo_green_dark'];
  }

  if (
    variable.includes('warning')
    || variable.includes('orange')
    || variable.includes('amber')
    || variable === 'gold-accent'
  ) {
    return ['@android:color/holo_orange_dark'];
  }

  if (
    variable.includes('red')
    || variable.includes('danger')
    || variable.startsWith('critical-')
    || variable.startsWith('emergency-')
  ) {
    return ['@android:color/holo_red_dark'];
  }

  if (variable.includes('backdrop') || variable.includes('overlay') || variable === 'card-shadow') {
    return ['@android:color/transparent'];
  }

  return ['?android:attr/colorAccent', '?android:attr/colorForeground', '@android:color/black'];
}

function themedColor(variable: string, lightFallback: string, darkFallback: string): string {
  if (Platform.OS === 'web') {
    return `var(--resq1-${variable}, ${lightFallback})`;
  }

  if (Platform.OS === 'ios') {
    return DynamicColorIOS({ light: lightFallback, dark: darkFallback }) as unknown as string;
  }

  if (Platform.OS === 'android') {
    return PlatformColor(
      `@color/resq1_${variable.replaceAll('-', '_')}`,
      ...androidColorFallbacks(variable),
    ) as unknown as string;
  }

  return lightFallback;
}

export const BrandColors = {
  navy: themedColor('text-strong', '#071A35', '#F9FAFB'),
  deepBlue: themedColor('accent', '#0A376D', '#60A5FA'),
  blue: themedColor('blue', '#0B74C4', '#60A5FA'),
  blueBorder: themedColor('blue-border', '#0B74C4', '#3B82F6'),
  lightBlue: themedColor('info-soft', '#EAF4FF', '#1E3A5F'),
  sky: themedColor('info-border', '#D8ECFF', '#3B82F6'),
  red: themedColor('red', '#D71920', '#FB7185'),
  redSoft: themedColor('red-soft', '#FDECEC', '#4C1D2A'),
  redBorder: themedColor('red-border', '#D71920', '#BE4455'),
  redAction: themedColor('red-action', '#D71920', '#BE4455'),
  criticalBackground: themedColor('critical-background', '#D71920', '#4C1D2A'),
  criticalBorder: themedColor('critical-border', '#D71920', '#BE4455'),
  criticalText: themedColor('critical-text', '#FFFFFF', '#FB7185'),
  success: themedColor('success', '#0F766E', '#5EEAD4'),
  successSoft: themedColor('success-soft', '#E8F7F4', '#153F3C'),
  successBorder: themedColor('success-border', '#0F766E', '#2A9D8F'),
  warningSoft: themedColor('warning-soft', '#FFF8E5', '#493619'),
  warning: themedColor('warning', '#B7791F', '#FBBF24'),
  warningText: themedColor('warning-text', '#7A4B00', '#FBBF24'),
  warningStrong: themedColor('warning-strong', '#8A4B00', '#FBBF24'),
  warningEmphasis: themedColor('warning-emphasis', '#B45309', '#FBBF24'),
  warningBorderStrong: themedColor('warning-border-strong', '#D69E2E', '#B7791F'),
  warningAccent: themedColor('warning-accent', '#F59E0B', '#B7791F'),
  warningAction: themedColor('warning-action', '#D97706', '#B7791F'),
  amberSoft: themedColor('amber-soft', '#FFF7DF', '#493619'),
  orangeSoft: themedColor('orange-soft', '#FFF1E6', '#493619'),
  orange: themedColor('orange', '#EA580C', '#FBBF24'),
  orangeText: themedColor('orange-text', '#9A3412', '#FBBF24'),
  dangerText: themedColor('danger-text', '#DC2626', '#FB7185'),
  dangerBorder: themedColor('danger-border', '#EF4444', '#BE4455'),
  dangerAction: themedColor('danger-action', '#DC2626', '#BE4455'),
  cautionSoft: themedColor('caution-soft', '#FFFBE6', '#493619'),
  dangerSoft: themedColor('danger-soft', '#FEF2F2', '#4C1D2A'),
  neutralSoft: themedColor('neutral-soft', '#EEF2F7', '#263449'),
  incidentSoft: themedColor('incident-soft', '#E8F1FF', '#1E3A5F'),
  chartSurface: themedColor('chart-surface', '#FAFCFF', '#263449'),
  border: themedColor('border', '#CBD9E8', '#354456'),
  muted: themedColor('text-muted', '#5F6F86', '#CBD5E1'),
  subtleText: themedColor('text-subtle', '#5F6F86', '#94A3B8'),
  text: themedColor('text', '#102033', '#F9FAFB'),
  background: themedColor('background', '#F6F9FC', '#141C28'),
  backgroundSecondary: themedColor('background-secondary', '#F6F9FC', '#182230'),
  white: themedColor('surface', '#FFFFFF', '#1D2836'),
  surface: themedColor('surface', '#FFFFFF', '#1D2836'),
  surfaceMuted: themedColor('surface-muted', '#EEF4FA', '#243141'),
  surfaceElevated: themedColor('surface-elevated', '#FFFFFF', '#263444'),
  controlSurface: themedColor('control-surface', '#FFFFFF', '#243141'),
  controlSurfaceSubtle: themedColor('control-surface-subtle', '#F6F9FC', '#202C3A'),
  primaryAction: themedColor('primary-action', '#071A35', '#2563A8'),
  accentAction: themedColor('accent-action', '#0A376D', '#2563A8'),
  primaryMuted: themedColor('primary-muted', '#EAF4FF', '#1E3A5F'),
  navigationActive: themedColor('navigation-active', '#D71920', '#60A5FA'),
  identitySurface: themedColor('identity-surface', '#071A35', '#1E3A5F'),
  identityBorder: themedColor('identity-border', '#0A376D', '#3B82F6'),
  onPrimaryMuted: themedColor('on-primary-muted', '#D8ECFF', '#CBD5E1'),
  warningBorder: themedColor('warning-border', '#E7C66C', '#B7791F'),
  backdrop: themedColor('backdrop', 'rgba(7, 26, 53, 0.58)', 'rgba(3, 6, 11, 0.76)'),
  modalBackdrop: themedColor('modal-backdrop', 'rgba(0, 0, 0, 0.5)', 'rgba(3, 6, 11, 0.76)'),
  dropdownBackdrop: themedColor('dropdown-backdrop', 'rgba(0, 0, 0, 0.4)', 'rgba(3, 6, 11, 0.72)'),
  placeholder: themedColor('placeholder', '#8B98A9', '#94A3B8'),
  subtleOverlay: themedColor('subtle-overlay', 'rgba(7, 26, 53, 0.04)', 'rgba(255, 255, 255, 0.04)'),
  mapOverlay: themedColor('map-overlay', 'rgba(255, 255, 255, 0.95)', 'rgba(32, 44, 61, 0.96)'),
  routeSafe: themedColor('route-safe', '#22C55E', '#5EEAD4'),
  routeAlternate: themedColor('route-alternate', '#000000', '#CBD5E1'),
  goldAccent: themedColor('gold-accent', '#F7C15C', '#FBBF24'),
  emergencyOrange: themedColor('emergency-orange', '#FF9500', '#FBBF24'),
  cardShadow: themedColor('card-shadow', 'rgba(7, 26, 53, 0.08)', 'rgba(0, 0, 0, 0.22)'),
  splashBlueTop: themedColor('splash-blue-top', '#3C9FFE', '#4D7FA8'),
  splashBlueBottom: themedColor('splash-blue-bottom', '#0274DF', '#315F83'),
  splashBlue: themedColor('splash-blue', '#208AEF', '#3F7199'),
  slate: themedColor('slate', '#24344D', '#94A3B8'),
  switchTrack: themedColor('switch-track', '#D1D5DB', '#354456'),
  switchThumb: themedColor('switch-thumb', '#F4F3F4', '#CBD5E1'),
  emergencyDeep: themedColor('emergency-deep', '#8B0000', '#4C1D2A'),
  emergencyBright: themedColor('emergency-bright', '#FF0000', '#BE4455'),
  safeBright: themedColor('safe-bright', '#00FF00', '#2A9D8F'),
  onPrimary: themedColor('on-primary', '#FFFFFF', '#FFFFFF'),
} as const;
