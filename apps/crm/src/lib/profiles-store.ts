import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";

export type ProfileRole = "owner" | "manager" | "agent";

export type Profile = {
  id: string;
  agencyId: string;
  teamId: string | null;
  fullName: string;
  email: string;
  role: ProfileRole;
  phone: string;
  isActive: boolean;
  createdAt: string;
};

export type ProfileWithStats = Profile & {
  totalLeads: number;
  hotLeads: number;
  openTasks: number;
};

type SupabaseProfileRow = {
  id: string;
  agency_id: string;
  team_id: string | null;
  full_name: string;
  email: string;
  role: string;
  phone: string;
  is_active: boolean;
  created_at: string;
};

const mockProfiles: Profile[] = [
  {
    id: "33333333-3333-3333-3333-333333333331",
    agencyId: "11111111-1111-1111-1111-111111111111",
    teamId: "22222222-2222-2222-2222-222222222222",
    fullName: "Lucia Hrivnáková",
    email: "lucia@demorealitka.sk",
    role: "agent",
    phone: "+421900111111",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333332",
    agencyId: "11111111-1111-1111-1111-111111111111",
    teamId: "22222222-2222-2222-2222-222222222222",
    fullName: "Tomáš Krištof",
    email: "tomas@demorealitka.sk",
    role: "agent",
    phone: "+421900222222",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    agencyId: "11111111-1111-1111-1111-111111111111",
    teamId: "22222222-2222-2222-2222-222222222222",
    fullName: "Majiteľ Kancelárie",
    email: "owner@demorealitka.sk",
    role: "owner",
    phone: "+421900333333",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];



function mapRow(row: SupabaseProfileRow): Profile {
  return {
    id: row.id,
    agencyId: row.agency_id,
    teamId: row.team_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role as ProfileRole,
    phone: row.phone,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listProfiles(): Promise<Profile[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockProfiles;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) {
    console.error("listProfiles error:", error.message);
    return mockProfiles;
  }

  return (data ?? []).map((r) => mapRow(r as SupabaseProfileRow));
}

export async function getProfileById(id: string): Promise<Profile | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockProfiles.find((p) => p.id === id);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return mockProfiles.find((p) => p.id === id);
  return mapRow(data as SupabaseProfileRow);
}

export type ProfileInput = {
  fullName: string;
  email: string;
  phone: string;
  role: ProfileRole;
  teamId: string | null;
  isActive: boolean;
};

export async function updateProfile(
  id: string,
  input: Partial<ProfileInput>
): Promise<Profile> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase nie je nastavený.");

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
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as SupabaseProfileRow);
}

export async function getProfilesWithStats(): Promise<ProfileWithStats[]> {
  const supabase = getSupabaseClient();

  const profiles = supabase ? await listProfiles() : mockProfiles;

  if (!supabase) {
    return profiles.map((p) => ({ ...p, totalLeads: 0, hotLeads: 0, openTasks: 0 }));
  }

  const [leadsRes, tasksRes] = await Promise.all([
    supabase
      .from("leads")
      .select("assigned_profile_id, status")
      .not("assigned_profile_id", "is", null),
    supabase
      .from("tasks")
      .select("assigned_profile_id, status")
      .eq("status", "open")
      .not("assigned_profile_id", "is", null),
  ]);

  const leadsData: { assigned_profile_id: string; status: string }[] =
    leadsRes.data ?? [];
  const tasksData: { assigned_profile_id: string; status: string }[] =
    tasksRes.data ?? [];

  return profiles.map((p) => {
    const myLeads = leadsData.filter((l) => l.assigned_profile_id === p.id);
    const myTasks = tasksData.filter((t) => t.assigned_profile_id === p.id);
    return {
      ...p,
      totalLeads: myLeads.length,
      hotLeads: myLeads.filter((l) => l.status === "Horúci").length,
      openTasks: myTasks.length,
    };
  });
}
