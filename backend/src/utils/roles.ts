export function normalizeRole(role: unknown) {
  const normalizedRole = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  // Preserve access for the legacy database typo while all auth responses use
  // the canonical Community_Member value.
  return normalizedRole === 'commiunity_member' ? 'community_member' : normalizedRole;
}

export function canonicalRole(role: unknown) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'community_member') {
    return 'Community_Member';
  }

  if (normalizedRole === 'resident' || normalizedRole === 'admin' || normalizedRole === 'authority') {
    return normalizedRole;
  }

  return String(role ?? '').trim();
}

export function isAuthorityRole(role: unknown) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'admin' || normalizedRole === 'authority';
}

export function isCommunityMemberRole(role: unknown) {
  return normalizeRole(role) === 'community_member';
}

export function isResidentRole(role: unknown) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'resident' || normalizedRole === 'community_member';
}
