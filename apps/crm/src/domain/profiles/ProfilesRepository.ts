// src/domain/profiles/ProfilesRepository.ts

export interface AgentProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
}

/**
 * Abstrakcia nad zdrojom profilov (Supabase, in-memory, mock).
 */
export interface ProfilesRepository {
  /**
   * Vráti všetkých používateľov, ktorí sú relevantní pre denný playbook
   * (agent, manager, admin, owner).
   */
  getAllAgents(): Promise<AgentProfile[]>;
}
