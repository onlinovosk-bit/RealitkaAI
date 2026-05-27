"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/shared/empty-state";
import LeadsModule from "@/components/leads/leads-module";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listLeads, type Lead } from "@/lib/leads-store";
import { listProfiles, listTeams } from "@/lib/team-store";
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

export default function LeadsPageClient({
  profileMissingAgency,
  initialLeadCount,
}: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadViaApi = async (): Promise<boolean> => {
      try {
        const res = await fetch("/api/leads/inventory");
        if (!res.ok) return false;
        const payload = (await res.json()) as {
          inventory?: {
            leads: Lead[];
            teams: TeamOption[];
            profiles: ProfileOption[];
          };
        };
        if (!payload.inventory) return false;
        if (cancelled) return true;
        setLeads(payload.inventory.leads);
        setTeams(payload.inventory.teams);
        setProfiles(payload.inventory.profiles);
        setLoadError(null);
        return true;
      } catch {
        return false;
      }
    };

    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        const ok = await loadViaApi();
        if (!cancelled) {
          if (!ok) {
            setLoadError("Pripojenie k databáze nie je nakonfigurované.");
          }
          setLoading(false);
        }
        return;
      }

      try {
        const [leadRows, teamRows, profileRows] = await Promise.all([
          listLeads(undefined, supabase),
          listTeams(supabase),
          listProfiles(supabase),
        ]);

        if (cancelled) return;

        if (leadRows.length > 0) {
          setLeads(leadRows);
          setTeams(teamRows.map((team) => ({ id: team.id, name: team.name })));
          setProfiles(
            profileRows.map((profile) => ({
              id: profile.id,
              teamId: profile.teamId,
              fullName: profile.fullName,
              isActive: profile.isActive,
            })),
          );
          setLoadError(null);
          setLoading(false);
          return;
        }

        const ok = await loadViaApi();
        if (!cancelled) {
          if (!ok && leadRows.length === 0) {
            setLeads([]);
            setTeams(teamRows.map((team) => ({ id: team.id, name: team.name })));
            setProfiles(
              profileRows.map((profile) => ({
                id: profile.id,
                teamId: profile.teamId,
                fullName: profile.fullName,
                isActive: profile.isActive,
              })),
            );
          }
          setLoadError(null);
        }
      } catch (err) {
        const ok = await loadViaApi();
        if (!cancelled && !ok) {
          setLoadError(
            err instanceof Error ? err.message : "Nepodarilo sa načítať príležitosti.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
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

  return (
    <LeadsModule
      leads={leads}
      teams={teams}
      profiles={profiles}
      recommendations={recommendations}
      profileMissingAgency={profileMissingAgency}
      initialLeadCount={initialLeadCount}
    />
  );
}
