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
  return role
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

export function isAuthorityRole(role: string | null | undefined) {
  const normalizedRole = normalize(role);

  return normalizedRole === 'admin' || normalizedRole === 'authority';
}
