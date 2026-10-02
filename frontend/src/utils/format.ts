import type { AuthUser } from '@/types/auth';

export function firstName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/)[0] || 'Resident';
}

export function initials(fullName: string | null | undefined) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (parts.length === 0) {
    return 'R';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatRole(role: string) {
  return normalizeRole(role)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function parseDateValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = value.trim();
  const hasTimezone = /(?:z|[+-]\d{2}(?::?\d{2})?)$/i.test(timestamp);
  const normalizedTimestamp = timestamp.replace(' ', 'T');
  const date = new Date(hasTimezone ? normalizedTimestamp : `${normalizedTimestamp}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

const COLOMBO_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function renderSriLankaTime(date: Date) {
  const colombo = new Date(date.getTime() + COLOMBO_OFFSET_MS);
  const day = colombo.getUTCDate();
  const month = SHORT_MONTHS[colombo.getUTCMonth()];
  const year = colombo.getUTCFullYear();
  const hours = colombo.getUTCHours();
  const minutes = String(colombo.getUTCMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hour12}:${minutes} ${period}`;
}

function sriLankaDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  const date = parseDateValue(value);

  return date ? renderSriLankaTime(date) : value;
}

export function formatDateTime(value: string | null | undefined) {
  return sriLankaDateTime(value);
}

export function formatDateTimeColombo(value: string | null | undefined) {
  return sriLankaDateTime(value);
}

export function formatDateTimeColomboShort(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  const date = parseDateValue(value);

  if (!date) {
    return value;
  }

  const colombo = new Date(date.getTime() + COLOMBO_OFFSET_MS);
  const day = colombo.getUTCDate();
  const month = SHORT_MONTHS[colombo.getUTCMonth()];
  const hours = colombo.getUTCHours();
  const minutes = String(colombo.getUTCMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${day} ${month}, ${hour12}:${minutes} ${period}`;
}

export function plural(value: number, singular: string, pluralValue: string) {
  return value === 1 ? singular : pluralValue;
}

export function userArea(user: AuthUser | null | undefined) {
  return user?.location?.trim() || 'your area';
}

export function preview(value: string, limit = 118) {
  const text = value.trim();

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, Math.max(0, limit - 3)).trim()}...`;
}

export function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function normalizeRole(role: string | null | undefined) {
  const normalizedRole = normalize(role).replace(/[\s-]+/g, '_');

  return normalizedRole === 'commiunity_member' ? 'community_member' : normalizedRole;
}

export function isAuthorityRole(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'admin' || normalizedRole === 'authority';
}

export function isCommunityMemberRole(role: string | null | undefined) {
  return normalizeRole(role) === 'community_member';
}

export function isResidentRole(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'resident' || normalizedRole === 'community_member';
}
