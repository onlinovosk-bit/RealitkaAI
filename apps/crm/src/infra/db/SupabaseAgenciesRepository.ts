// src/infra/db/SupabaseAgenciesRepository.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgenciesRepository,
  DiscoveredAgency,
} from "@/domain/agency/AgencyDiscovery";

export class SupabaseAgenciesRepository implements AgenciesRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertDiscoveredAgencies(
    discovered: DiscoveredAgency[]
  ): Promise<{ created: number; updated: number }> {
    if (!discovered.length) return { created: 0, updated: 0 };

    let created = 0;
    let updated = 0;

    for (const agency of discovered) {
      // Check if agency exists by (portal, externalId)
      const { data: existing } = await this.supabase
        .from("agencies")
        .select("id")
        .eq("portal", agency.portal)
        .eq("external_id", agency.externalId)
        .maybeSingle();

      if (existing) {
        // Update existing
        await this.supabase
          .from("agencies")
          .update({
            name: agency.name,
            website: agency.website ?? null,
            email: agency.email ?? null,
            phone: agency.phone ?? null,
            city: agency.city ?? null,
            country: agency.country ?? "SK",
            listings_count: agency.listingsCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        // Snapshot listing count
        await this.supabase.from("listings_snapshot").insert({
          agency_id: existing.id,
          portal: agency.portal,
          listings_count: agency.listingsCount,
          snapshotted_at: new Date().toISOString(),
        });

        updated++;
      } else {
        // Insert new
        const { data: inserted } = await this.supabase
          .from("agencies")
          .insert({
            external_id: agency.externalId,
            name: agency.name,
            website: agency.website ?? null,
            email: agency.email ?? null,
            phone: agency.phone ?? null,
            city: agency.city ?? null,
            country: agency.country ?? "SK",
            portal: agency.portal,
            listings_count: agency.listingsCount,
          })
          .select("id")
          .single();

        if (inserted) {
          await this.supabase.from("listings_snapshot").insert({
            agency_id: inserted.id,
            portal: agency.portal,
            listings_count: agency.listingsCount,
            snapshotted_at: new Date().toISOString(),
          });
        }

        created++;
      }
    }

    return { created, updated };
  }
}
