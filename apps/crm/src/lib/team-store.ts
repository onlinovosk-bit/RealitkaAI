import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";
import { listLeads, type Lead } from "@/lib/leads-store";

export type Agency = {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  city: string | null;
  plan: string | null;
  isActive: boolean;
};

export type Team = {
  id: string;
  agencyId: string | null;
  name: string;
  isActive: boolean;
};

export type Profile = {
  id: string;
  agencyId: string | null;
  teamId: string | null;
  fullName: string;
  email: string | null;
  role: string;
  phone: string | null;
  isActive: boolean;
};

type SupabaseAgencyRow = {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  city: string | null;
  plan: string | null;
  is_active: boolean;
};

type SupabaseTeamRow = {
  id: string;
  agency_id: string | null;
  name: string;
  is_active: boolean;
};

type SupabaseProfileRow = {
  id: string;
  agency_id: string | null;
  team_id: string | null;
  full_name: string;
  email: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
};

const demoAgency: Agency = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Demo Realitka",
  slug: "demo-realitka",
  country: "Slovensko",
  city: "Bratislava",
  plan: "Pro",
  isActive: true,
};

const demoTeams: Team[] = [
  {
    id: "22222222-2222-2222-2222-222222222222",
    agencyId: demoAgency.id,
    name: "Predaj Bratislava",
    isActive: true,
  },
];

const demoProfiles: Profile[] = [
  {
    id: "33333333-3333-3333-3333-333333333331",
    agencyId: demoAgency.id,
    teamId: demoTeams[0].id,
    fullName: "Lucia Hrivnáková",
    email: "lucia@demorealitka.sk",
    role: "agent",
    phone: "+421900111111",
    isActive: true,
  },
  {
    id: "33333333-3333-3333-3333-333333333332",
    agencyId: demoAgency.id,
    teamId: demoTeams[0].id,
    fullName: "Tomáš Krištof",
    email: "tomas@demorealitka.sk",
    role: "agent",
    phone: "+421900222222",
    isActive: true,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    agencyId: demoAgency.id,
    teamId: demoTeams[0].id,
    fullName: "Majiteľ Kancelárie",
    email: "owner@demorealitka.sk",
    role: "owner",
    phone: "+421900333333",
    isActive: true,
  },
];

const globalTeamStore = globalThis as typeof globalThis & {
  __realitkaDemoTeams?: Team[];
  __realitkaDemoProfiles?: Profile[];
};

function getDemoTeamsStore() {
  if (!globalTeamStore.__realitkaDemoTeams) {
    globalTeamStore.__realitkaDemoTeams = [...demoTeams];
  }

  return globalTeamStore.__realitkaDemoTeams;
}

function getDemoProfilesStore() {
  if (!globalTeamStore.__realitkaDemoProfiles) {
    globalTeamStore.__realitkaDemoProfiles = [...demoProfiles];
  }

  return globalTeamStore.__realitkaDemoProfiles;
}

function mapAgency(row: SupabaseAgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    city: row.city,
    plan: row.plan,
    isActive: row.is_active,
  };
}

function mapTeam(row: SupabaseTeamRow): Team {
  return {
    id: row.id,
    agencyId: row.agency_id,
    name: row.name,
    isActive: row.is_active,
  };
}

function mapProfile(row: SupabaseProfileRow): Profile {
  return {
    id: row.id,
    agencyId: row.agency_id,
    teamId: row.team_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    isActive: row.is_active,
  };
}

export async function listAgencies(): Promise<Agency[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [demoAgency];

  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, slug, country, city, plan, is_active")
    .order("created_at", { ascending: true });

  if (error || !data) return [demoAgency];

  return (data as SupabaseAgencyRow[]).map(mapAgency);
}

export async function listTeams(): Promise<Team[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getDemoTeamsStore();

  const { data, error } = await supabase
    .from("teams")
    .select("id, agency_id, name, is_active")
    .order("created_at", { ascending: true });

  if (error || !data) return getDemoTeamsStore();

  return (data as SupabaseTeamRow[]).map(mapTeam);
}

export async function listProfiles(): Promise<Profile[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getDemoProfilesStore();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, agency_id, team_id, full_name, email, role, phone, is_active")
    .order("created_at", { ascending: true });

  if (error || !data) return getDemoProfilesStore();

  return (data as SupabaseProfileRow[]).map(mapProfile);
}

export async function createTeam(input: { agencyId: string; name: string }) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const teams = getDemoTeamsStore();
    const created: Team = {
      id: crypto.randomUUID(),
      agencyId: input.agencyId,
      name: input.name,
      isActive: true,
    };

    teams.unshift(created);
    return created;
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({
      agency_id: input.agencyId,
      name: input.name,
      is_active: true,
    })
    .select("id, agency_id, name, is_active")
    .single();

  if (error) throw new Error(error.message);

  return mapTeam(data as SupabaseTeamRow);
}

export async function updateTeam(
  id: string,
  input: { name?: string; isActive?: boolean }
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const teams = getDemoTeamsStore();
    const index = teams.findIndex((team) => team.id === id);
    const current = index >= 0 ? teams[index] : undefined;
    if (!current) {
      throw new Error("Tím sa nenašiel.");
    }

    const updated: Team = {
      ...current,
      name: input.name ?? current.name,
      isActive: input.isActive ?? current.isActive,
    };

    teams[index] = updated;
    return updated;
  }

  const patch: Partial<SupabaseTeamRow> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("teams")
    .update(patch)
    .eq("id", id)
    .select("id, agency_id, name, is_active")
    .single();

  if (error) throw new Error(error.message);

  return mapTeam(data as SupabaseTeamRow);
}

export async function createProfile(input: {
  agencyId: string;
  teamId: string | null;
  fullName: string;
  email: string;
  role: string;
  phone: string;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const profiles = getDemoProfilesStore();
    const created: Profile = {
      id: crypto.randomUUID(),
      agencyId: input.agencyId,
      teamId: input.teamId,
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      phone: input.phone,
      isActive: true,
    };

    profiles.unshift(created);
    return created;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      agency_id: input.agencyId,
      team_id: input.teamId,
      full_name: input.fullName,
      email: input.email,
      role: input.role,
      phone: input.phone,
      is_active: true,
    })
    .select("id, agency_id, team_id, full_name, email, role, phone, is_active")
    .single();

  if (error) throw new Error(error.message);

  return mapProfile(data as SupabaseProfileRow);
}

export async function getProfileById(id: string): Promise<Profile | undefined> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return getDemoProfilesStore().find((profile) => profile.id === id);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, agency_id, team_id, full_name, email, role, phone, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapProfile(data as SupabaseProfileRow);
}

export async function updateProfile(
  id: string,
  input: {
    fullName?: string;
    email?: string;
    phone?: string;
    role?: string;
    teamId?: string | null;
    isActive?: boolean;
  }
): Promise<Profile> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const profiles = getDemoProfilesStore();
    const index = profiles.findIndex((profile) => profile.id === id);

    if (index === -1) {
      throw new Error("Profil nenájdený");
    }

    const current = profiles[index];
    const updated: Profile = {
      ...current,
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };

    profiles[index] = updated;
    return updated;
  }

  const patch: Partial<SupabaseProfileRow> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.role !== undefined) patch.role = input.role;
  if (input.teamId !== undefined) patch.team_id = input.teamId;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("id, agency_id, team_id, full_name, email, role, phone, is_active")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodarilo sa upraviť profil.");
  }

  return mapProfile(data as SupabaseProfileRow);
}

export async function assignLeadToProfile(leadId: string, profileId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { ok: true };
  }

  const profiles = await listProfiles();
  const profile = profiles.find((item) => item.id === profileId);

  const { error } = await supabase
    .from("leads")
    .update({
      assigned_profile_id: profileId,
      assigned_agent: profile?.fullName ?? "Priradený agent",
      last_contact: "Priradené agentovi práve teraz",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  return { ok: true };
}

export async function getTeamDashboardData(): Promise<{
  agencies: Agency[];
  teams: Team[];
  profiles: Profile[];
  leads: Lead[];
}> {
  const [agencies, teams, profiles, leads] = await Promise.all([
    listAgencies(),
    listTeams(),
    listProfiles(),
    listLeads(),
  ]);

  return {
    agencies,
    teams,
    profiles,
    leads,
  };
}

// Team Performance Analytics
export type TeamKpi = {
  teamId: string;
  teamName: string;
  memberCount: number;
  totalLeads: number;
  hotLeads: number;
  conversionRate: number;
  avgScore: number;
  matchingsSent: number;
};

export async function getTeamPerformanceKpis(): Promise<TeamKpi[]> {
  const [teams, profiles, leads] = await Promise.all([
    listTeams(),
    listProfiles(),
    listLeads(),
  ]);

  return teams.map((team) => {
    const members = profiles.filter((p) => p.teamId === team.id);
    const teamLeads = leads.filter((l) =>
      members.some((m) => m.id === l.assignedProfileId)
    );
    const hotLeads = teamLeads.filter((l) => l.status === "Horúci").length;
    const avgScore = teamLeads.length > 0 
      ? Math.round(teamLeads.reduce((sum, l) => sum + l.score, 0) / teamLeads.length)
      : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      memberCount: members.length,
      totalLeads: teamLeads.length,
      hotLeads,
      conversionRate: teamLeads.length > 0 ? Math.round((hotLeads / teamLeads.length) * 100) : 0,
      avgScore,
      matchingsSent: Math.floor(Math.random() * 50), // Mock value - in production would query matching_store
    };
  });
}

export type AgentPerformance = {
  profileId: string;
  fullName: string;
  email: string | null;
  role: string;
  totalLeads: number;
  hotLeads: number;
  avgScore: number;
  conversionRate: number;
};

export async function getAgentPerformanceMetrics(): Promise<AgentPerformance[]> {
  const [profiles, leads] = await Promise.all([listProfiles(), listLeads()]);

  return profiles
    .filter((p) => p.role === "agent" || p.role === "manager")
    .map((profile) => {
      const agentLeads = leads.filter((l) => l.assignedProfileId === profile.id);
      const hotLeads = agentLeads.filter((l) => l.status === "Horúci").length;
      const avgScore =
        agentLeads.length > 0
          ? Math.round(agentLeads.reduce((sum, l) => sum + l.score, 0) / agentLeads.length)
          : 0;

      return {
        profileId: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
        totalLeads: agentLeads.length,
        hotLeads,
        avgScore,
        conversionRate: agentLeads.length > 0 ? Math.round((hotLeads / agentLeads.length) * 100) : 0,
      };
    });
}

