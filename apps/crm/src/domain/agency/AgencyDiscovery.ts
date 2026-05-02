// src/domain/agency/AgencyDiscovery.ts

export interface DiscoveredAgency {
  externalId: string;      // ID z portálu, ak existuje
  name: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  portal: string;          // "nehnutelnosti.sk", ...
  listingsCount: number;
}

export interface AgencyDiscoverySource {
  /** Názov zdroja – portál, API, ... */
  name: string;
  /** Nájde nové agentúry za dané časové obdobie alebo batch. */
  discoverNewAgencies(): Promise<DiscoveredAgency[]>;
}

export interface AgenciesRepository {
  /**
   * Uloží/aktualizuje agentúry podľa externalId + portal.
   * Vráti počet nových a počet aktualizovaných.
   */
  upsertDiscoveredAgencies(
    discovered: DiscoveredAgency[]
  ): Promise<{ created: number; updated: number }>;
}

/**
 * Orchestruje discovery z viacerých zdrojov (portály, API).
 */
export class AgencyDiscoveryEngine {
  constructor(
    private readonly sources: AgencyDiscoverySource[],
    private readonly agenciesRepo: AgenciesRepository
  ) {}

  async run(): Promise<{ created: number; updated: number }> {
    let totalCreated = 0;
    let totalUpdated = 0;

    for (const source of this.sources) {
      const batch = await source.discoverNewAgencies();
      if (!batch.length) continue;

      const { created, updated } =
        await this.agenciesRepo.upsertDiscoveredAgencies(batch);

      totalCreated += created;
      totalUpdated += updated;
    }

    return { created: totalCreated, updated: totalUpdated };
  }
}
