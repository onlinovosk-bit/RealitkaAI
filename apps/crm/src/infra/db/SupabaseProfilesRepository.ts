// src/infra/db/SupabaseProfilesRepository.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProfilesRepository,
  AgentProfile,
} from "@/domain/profiles/ProfilesRepository";

export class SupabaseProfilesRepository implements ProfilesRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAllAgents(): Promise<AgentProfile[]> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["agent", "manager", "admin", "owner"]);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
    }));
  }
}
