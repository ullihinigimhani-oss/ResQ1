import type { PreferredLanguage } from '@/types/auth';

export const preferredLanguages = ['English', 'Sinhala', 'Tamil'] as const satisfies readonly PreferredLanguage[];

export const preferredLanguageLabels: Record<PreferredLanguage, string> = {
  English: 'English',
  Sinhala: 'සිංහල',
  Tamil: 'தமிழ்',
};

export function preferredLanguageOrNull(value: string | null | undefined): PreferredLanguage | null {
  return preferredLanguages.includes(value as PreferredLanguage) ? (value as PreferredLanguage) : null;
}

export function toPreferredLanguage(
  value: string | null | undefined,
  fallback: PreferredLanguage = 'English',
): PreferredLanguage {
  return preferredLanguageOrNull(value) ?? fallback;
}
