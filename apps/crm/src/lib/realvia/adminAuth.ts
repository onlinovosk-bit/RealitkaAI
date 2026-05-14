import { NextResponse } from 'next/server';
import { getCurrentProfile, type CurrentProfile } from '@/lib/auth';
import { normalizeRole, PERMISSION_GROUPS, DB_ROLES } from '@/lib/role-config';

/** Owner / Manager / Founder / legacy Admin — same cohort as destructive integration ops */
const ALLOWED = new Set(
  [...PERMISSION_GROUPS.FULL_ADMIN, DB_ROLES.ADMIN].map((r) => r.toLowerCase()),
);

export async function assertRealviaAdminApi():
  Promise<NextResponse | { profile: CurrentProfile }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roleKey = normalizeRole(profile.role);

  // Match profile rows that still store uppercase / mixed casing
  if (!ALLOWED.has(roleKey)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { profile };
}
