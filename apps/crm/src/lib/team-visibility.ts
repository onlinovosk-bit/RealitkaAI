import type { Team, Profile } from "@/lib/team-store";
import type { Lead } from "@/lib/leads-store";

type AnyProfile = Profile & { team_id?: string | null };

export function getVisibleTeamsForProfile(profile: AnyProfile | null, teams: Team[]): Team[] {
  if (!profile) return [];
  if (profile.role === "owner") return teams;
  if (profile.role === "manager") {
    const profileTeamId = profile.teamId ?? profile.team_id ?? null;
    return teams.filter((team) => team.id === profileTeamId);
  }
  const profileTeamId = profile.teamId ?? profile.team_id ?? null;
  return teams.filter((team) => team.id === profileTeamId);
}

export function getVisibleProfilesForProfile(
  profile: AnyProfile | null,
  profiles: Profile[]
): Profile[] {
  if (!profile) return [];
  if (profile.role === "owner") return profiles;
  if (profile.role === "manager") {
    const profileTeamId = profile.teamId ?? profile.team_id ?? null;
    return profiles.filter((p) => p.teamId === profileTeamId);
  }
  return profiles.filter((p) => p.id === profile.id);
}

export function getVisibleLeadsForProfile(
  profile: AnyProfile | null,
  leads: Lead[],
  profiles: Profile[]
): Lead[] {
  if (!profile) return [];
  if (profile.role === "owner") return leads;
  if (profile.role === "manager") {
    const profileTeamId = profile.teamId ?? profile.team_id ?? null;
    const teamProfileIds = profiles
      .filter((p) => p.teamId === profileTeamId)
      .map((p) => p.id);
    return leads.filter((lead) => {
      const assignedId = (lead as any).assignedProfileId ?? (lead as any).assigned_profile_id ?? null;
      return assignedId && teamProfileIds.includes(assignedId);
    });
  }
  return leads.filter((lead) => {
    const assignedId = (lead as any).assignedProfileId ?? (lead as any).assigned_profile_id ?? null;
    return assignedId === profile.id;
  });
}

export function getAssignableProfilesForProfile(
  profile: AnyProfile | null,
  profiles: Profile[]
): Profile[] {
  if (!profile) return [];
  if (profile.role === "owner") return profiles;
  if (profile.role === "manager") {
    const profileTeamId = profile.teamId ?? profile.team_id ?? null;
    return profiles.filter((p) => p.teamId === profileTeamId);
  }
  return [];
}

export function canManageTeamArea(profile: AnyProfile | null): boolean {
  if (!profile) return false;
  return profile.role === "owner" || profile.role === "manager";
}
