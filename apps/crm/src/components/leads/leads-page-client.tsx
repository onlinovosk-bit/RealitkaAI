"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/shared/empty-state";
import LeadsModule from "@/components/leads/leads-module";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listLeads, type Lead } from "@/lib/leads-store";
import { listProfiles, listTeams } from "@/lib/team-store";
import {
  fetchLeadsInventoryFromApi,
  fetchTenantHealthHint,
  type LeadsInventorySnapshot,
} from "@/lib/leads/load-leads-inventory-client";
import { recommendations } from "@/lib/mock-data";

type TeamOption = { id: string; name: string };
type ProfileOption = {
  id: string;
  teamId: string | null;
  fullName: string;
  isActive: boolean;
};

type Props = {
  profileMissingAgency: boolean;
  /** Voliteľný SSR počet; zoznam sa vždy načíta v prehliadači kvôli RLS session. */
  initialLeadCount?: number;
};

function mapInventory(snapshot: LeadsInventorySnapshot): {
  leads: Lead[];
  teams: TeamOption[];
  profiles: ProfileOption[];
} {
  return {
    leads: snapshot.leads,
    teams: snapshot.teams,
    profiles: snapshot.profiles,
  };
}

async function loadFromBrowser(): Promise<LeadsInventorySnapshot | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const [leadRows, teamRows, profileRows] = await Promise.all([
    listLeads(undefined, supabase),
    listTeams(supabase),
    listProfiles(supabase),
  ]);

  return {
    leads: leadRows,
    teams: teamRows.map((team) => ({ id: team.id, name: team.name })),
    profiles: profileRows.map((profile) => ({
      id: profile.id,
      teamId: profile.teamId,
      fullName: profile.fullName,
      isActive: profile.isActive,
    })),
  };
}

export default function LeadsPageClient({
  profileMissingAgency,
  initialLeadCount,
}: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tenantLeadsCount, setTenantLeadsCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [browserSnapshot, apiResult] = await Promise.all([
        loadFromBrowser().catch(() => null),
        fetchLeadsInventoryFromApi(),
      ]);

      if (cancelled) return;

      if (!apiResult.ok && apiResult.status === 401) {
        setLoadError(apiResult.message);
        setLoading(false);
        return;
      }

      const apiSnapshot = apiResult.ok ? apiResult.inventory : null;
      const browserCount = browserSnapshot?.leads.length ?? 0;
      const apiCount = apiSnapshot?.leads.length ?? 0;

      const chosen =
        apiCount >= browserCount && apiSnapshot
          ? apiSnapshot
          : browserSnapshot ?? apiSnapshot;

      if (chosen) {
        const mapped = mapInventory(chosen);
        setLeads(mapped.leads);
        setTeams(mapped.teams);
        setProfiles(mapped.profiles);
        setLoadError(null);

        if (chosen.leads.length === 0) {
          const health = await fetchTenantHealthHint();
          if (!cancelled && health) {
            setTenantLeadsCount(health.leadsCount);
          }
        }
      } else if (!apiResult.ok) {
        setLoadError(apiResult.message);
      } else {
        setLoadError("Nepodarilo sa načítať príležitosti.");
      }

      if (!cancelled) setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-600">
        Načítavam príležitosti…
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        title="Príležitosti sa nepodarilo načítať"
        description={loadError}
      />
    );
  }

  const zeroHint =
    leads.length === 0 && tenantLeadsCount != null && tenantLeadsCount > 0
      ? `Server pod RLS vidí ${tenantLeadsCount} leadov — skús tvrdé obnovenie (Ctrl+Shift+R) alebo odhlásenie a nové prihlásenie. Over GET /api/crm/tenant-health a GET /api/leads/inventory v DevTools.`
      : leads.length === 0 && profileMissingAgency
        ? "V profile chýba agency_id — RLS nevráti riadky. Skontroluj GET /api/crm/tenant-health."
        : undefined;

  return (
    <LeadsModule
      leads={leads}
      teams={teams}
      profiles={profiles}
      recommendations={recommendations}
      profileMissingAgency={profileMissingAgency}
      initialLeadCount={initialLeadCount}
      emptyDescriptionOverride={zeroHint}
    />
  );
}
