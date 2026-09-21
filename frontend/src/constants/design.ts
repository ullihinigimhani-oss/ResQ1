import { Platform } from 'react-native';

import { BrandColors } from '@/constants/brand';

export const colors = {
  ...BrandColors,
  amber: BrandColors.warning,
  amberSoft: Platform.OS === 'web' ? 'var(--resq1-amber-soft, #FFF7DF)' : '#FFF7DF',
  amberText: BrandColors.warningText,
  amberStrong: BrandColors.warningStrong,
  amberEmphasis: BrandColors.warningEmphasis,
  orange: BrandColors.orange,
  orangeSoft: BrandColors.orangeSoft,
  orangeText: BrandColors.orangeText,
  dangerText: BrandColors.dangerText,
  cautionSoft: BrandColors.cautionSoft,
  dangerSoft: BrandColors.dangerSoft,
  green: BrandColors.success,
  greenSoft: BrandColors.successSoft,
  slate: Platform.OS === 'web' ? 'var(--resq1-slate, #24344D)' : '#24344D',
  surface: BrandColors.surface,
  surfaceBlue: BrandColors.lightBlue,
  surfaceMuted: BrandColors.surfaceMuted,
  line: BrandColors.border,
  textMuted: BrandColors.muted,
  textStrong: BrandColors.text,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
} as const;

export const typography = {
  hero: {
    fontSize: 34,
    fontWeight: '900' as const,
    lineHeight: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900' as const,
    lineHeight: 34,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '900' as const,
    lineHeight: 16,
  },
} as const;

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: `0px 10px 24px ${BrandColors.cardShadow}`,
    },
    default: {
      elevation: 2,
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
  }),
} as const;
