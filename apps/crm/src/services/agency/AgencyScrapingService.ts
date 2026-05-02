// src/services/agency/AgencyScrapingService.ts

import type { AgencyDiscoveryEngine } from "@/domain/agency/AgencyDiscovery";

export class AgencyScrapingService {
  constructor(private readonly engine: AgencyDiscoveryEngine) {}

  async runFullCycle(): Promise<void> {
    const { created, updated } = await this.engine.run();
    console.log(
      `Agency scraping: created=${created}, updated=${updated}`
    );
  }
}
