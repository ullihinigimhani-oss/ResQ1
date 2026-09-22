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

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  hero: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  cardTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  supporting: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 19,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
} as const;

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: `0px 2px 8px ${BrandColors.cardShadow}`,
    },
    default: {
      elevation: 1,
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
    },
  }),
} as const;
