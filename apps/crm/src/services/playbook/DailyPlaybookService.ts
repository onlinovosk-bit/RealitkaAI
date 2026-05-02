// src/services/playbook/DailyPlaybookService.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfilesRepository } from "@/domain/profiles/ProfilesRepository";
import type { PlaybookItemDto } from "@/services/playbook/types";
import { generateDailyPlaybook } from "@/services/playbook/generateDailyPlaybook";

export class DailyPlaybookService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly profilesRepo: ProfilesRepository
  ) {}

  /**
   * Run daily playbook for all agents.
   * Aktuálne používa rovnaký playbook pre všetkých, ale v budúcnosti
   * sem vieš pridať per-agent personalizáciu.
   */
  async runForAllAgents(limit = 40): Promise<void> {
    const agents = await this.profilesRepo.getAllAgents();

    if (!agents.length) {
      const items = await this.runGlobal(limit);
      console.log(`  Globálny Playbook: ${items.length} položiek`);
      return;
    }

    for (const agent of agents) {
      const label = agent.fullName ?? agent.email ?? agent.id;
      console.log(`  Agent: ${label} (${agent.id})`);
      const items = await this.runForAgent(agent.id, limit);
      console.log(`    → ${items.length} položiek v Playbooku`);
    }
  }

  /**
   * Per-agent playbook – prvá verzia môže byť rovnaká ako globálny,
   * neskôr vieš filtrovať podľa agentId.
   */
  async runForAgent(agentId: string, limit = 40): Promise<PlaybookItemDto[]> {
    const items = await generateDailyPlaybook(this.supabase, limit);
    return items;
  }

  /**
   * Globálny playbook – to, čo si mal doteraz.
   */
  async runGlobal(limit = 40): Promise<PlaybookItemDto[]> {
    const items = await generateDailyPlaybook(this.supabase, limit);
    return items;
  }
}
