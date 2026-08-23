import { colors } from '@/constants/design';
import type { Alert } from '@/types/alert';
import { normalize } from '@/utils/format';

export type AlertDisplayTheme = 'danger' | 'warning';

export const alertDisplayThemeStyles: Record<AlertDisplayTheme, {
  accent: string;
  backgroundColor: string;
  borderColor: string;
  pillBackground: string;
  pillBorder: string;
  pillText: string;
  titleColor: string;
}> = {
  danger: {
    accent: colors.red,
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    pillBackground: colors.redSoft,
    pillBorder: colors.red,
    pillText: colors.red,
    titleColor: colors.red,
  },
  warning: {
    accent: colors.amber,
    backgroundColor: colors.warningSoft,
    borderColor: colors.amber,
    pillBackground: colors.warningSoft,
    pillBorder: colors.amber,
    pillText: '#8A4B00',
    titleColor: '#8A4B00',
  },
};

export function normalizeAlertArea(value: string | null | undefined) {
  return normalize(value).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function alertAffectsResidentArea(
  residentArea: string | null | undefined,
  alertArea: string | null | undefined,
) {
  const resident = normalizeAlertArea(residentArea);
  const affected = normalizeAlertArea(alertArea);

  return Boolean(resident && affected && (resident === affected || affected.includes(resident) || resident.includes(affected)));
}

export function getResidentAlertDisplayTheme(
  alert: Alert,
  residentArea: string | null | undefined,
): AlertDisplayTheme {
  return alertAffectsResidentArea(residentArea, alert.affectedArea) ? 'danger' : 'warning';
}

export function alertDisplayThemeOrNull(value: string | null | undefined): AlertDisplayTheme | null {
  return value === 'danger' || value === 'warning' ? value : null;
}
