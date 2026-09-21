import { Platform } from 'react-native';

function themedColor(variable: string, lightFallback: string) {
  return Platform.OS === 'web' ? `var(--resq1-${variable}, ${lightFallback})` : lightFallback;
}

export const BrandColors = {
  navy: themedColor('text-strong', '#071A35'),
  deepBlue: themedColor('accent', '#0A376D'),
  blue: themedColor('blue', '#0B74C4'),
  lightBlue: themedColor('info-soft', '#EAF4FF'),
  sky: themedColor('info-border', '#D8ECFF'),
  red: themedColor('red', '#D71920'),
  redSoft: themedColor('red-soft', '#FDECEC'),
  success: themedColor('success', '#0F766E'),
  successSoft: themedColor('success-soft', '#E8F7F4'),
  warningSoft: themedColor('warning-soft', '#FFF8E5'),
  warningText: themedColor('warning-text', '#7A4B00'),
  warningStrong: themedColor('warning-strong', '#8A4B00'),
  warningEmphasis: themedColor('warning-emphasis', '#B45309'),
  orangeSoft: themedColor('orange-soft', '#FFF1E6'),
  orangeText: themedColor('orange-text', '#9A3412'),
  dangerText: themedColor('danger-text', '#DC2626'),
  cautionSoft: themedColor('caution-soft', '#FFFBE6'),
  dangerSoft: themedColor('danger-soft', '#FEF2F2'),
  neutralSoft: themedColor('neutral-soft', '#EEF2F7'),
  incidentSoft: themedColor('incident-soft', '#E8F1FF'),
  chartSurface: themedColor('chart-surface', '#FAFCFF'),
  border: themedColor('border', '#CBD9E8'),
  muted: themedColor('text-muted', '#5F6F86'),
  text: themedColor('text', '#102033'),
  background: themedColor('background', '#F6F9FC'),
  white: themedColor('surface', '#FFFFFF'),
  surface: themedColor('surface', '#FFFFFF'),
  surfaceMuted: themedColor('surface-muted', '#EEF4FA'),
  primaryAction: themedColor('primary-action', '#071A35'),
  accentAction: themedColor('accent-action', '#0A376D'),
  onPrimary: '#FFFFFF',
} as const;
