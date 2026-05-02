// src/infra/scraping/PortalNehnutelnostiSource.ts

import type { DiscoveredAgency, AgencyDiscoverySource } from "@/domain/agency/AgencyDiscovery";

export class PortalNehnutelnostiSource implements AgencyDiscoverySource {
  readonly name = "nehnutelnosti.sk";

  constructor(
    // sem injectneš HTTP klienta / scraper, prípadne konfig
  ) {}

  async discoverNewAgencies(): Promise<DiscoveredAgency[]> {
    // TODO: sem presuň existujúci scraping z jobu/scripts
    const results: DiscoveredAgency[] = [];

    // fill results...

    return results;
  }
}
