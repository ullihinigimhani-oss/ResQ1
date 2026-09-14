import { Platform } from 'react-native';

import { BrandColors } from '@/constants/brand';

export const colors = {
  ...BrandColors,
  amber: '#B7791F',
  amberSoft: '#FFF7DF',
  orange: '#EA580C',
  orangeSoft: '#FFF1E6',
  green: BrandColors.success,
  greenSoft: BrandColors.successSoft,
  slate: '#24344D',
  surface: BrandColors.white,
  surfaceBlue: BrandColors.lightBlue,
  surfaceMuted: '#EEF4FA',
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
      boxShadow: '0px 10px 24px rgba(7, 26, 53, 0.08)',
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
