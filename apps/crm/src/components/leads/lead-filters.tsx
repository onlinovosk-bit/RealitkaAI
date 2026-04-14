"use client";

import { useState, useEffect, useMemo } from "react";
import { type Lead } from "@/lib/leads-store";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

type TeamOption = {
  id: string;
  name: string;
};

type ProfileOption = {
  id: string;
  teamId: string | null;
  fullName: string;
  isActive: boolean;
};

type LeadFiltersProps = {
  leads: Lead[];
  teams: TeamOption[];
  profiles: ProfileOption[];
  onFilter: (filtered: Lead[]) => void;
};

export default function LeadFilters({
  leads,
  teams,
  profiles,
  onFilter,
}: LeadFiltersProps) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [minScore, setMinScore] = useState("");
  const [assignedProfileId, setAssignedProfileId] = useState("");
  const [teamId, setTeamId] = useState("");

  const statuses = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.status))),
    [leads]
  );
  const locations = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.location))),
    [leads]
  );
  const activeProfiles = useMemo(
    () => profiles.filter((profile) => profile.isActive),
    [profiles]
  );

  useEffect(() => {
    let filtered = [...leads];

    // Filter by search query
    if (q.trim()) {
      const query = q.toLowerCase().trim();
      filtered = filtered.filter(lead =>
        [lead.name, lead.email, lead.phone, lead.location, lead.budget, lead.status, lead.assignedAgent, lead.source]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter(lead => lead.status === status);
    }

    // Filter by location
    if (location) {
      filtered = filtered.filter(lead => lead.location === location);
    }

    // Filter by minimum score
    if (minScore) {
      const score = parseInt(minScore);
      if (!isNaN(score)) {
        filtered = filtered.filter(lead => lead.score >= score);
      }
    }

    if (assignedProfileId) {
      filtered = filtered.filter(
        (lead) => lead.assignedProfileId === assignedProfileId
      );
    }

    if (teamId) {
      const teamProfileIds = new Set(
        activeProfiles
          .filter((profile) => profile.teamId === teamId)
          .map((profile) => profile.id)
      );
      filtered = filtered.filter(
        (lead) => !!lead.assignedProfileId && teamProfileIds.has(lead.assignedProfileId)
      );
    }

    onFilter(filtered);
  }, [leads, q, status, location, minScore, assignedProfileId, teamId, activeProfiles, onFilter]);

  function clearFilters() {
    setQ("");
    setStatus("");
    setLocation("");
    setMinScore("");
    setAssignedProfileId("");
    setTeamId("");
  }

  const hotCount = leads.filter((l) => l.status === "Horúci" || l.score >= 85).length;
  const isHotFilter = status === "Horúci" && minScore === "";

  function activateHotFilter() {
    setStatus("Horúci");
    setQ("");
    setLocation("");
    setMinScore("");
    setAssignedProfileId("");
    setTeamId("");
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <RadiantSpriteIcon icon="leads" sizeClassName="h-12 w-12" className="mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Filtre príležitostí</h2>
            <p className="text-sm text-gray-500">
              Filtrovanie podľa stavu, lokality, tímu, agenta a AI skóre.
            </p>
          </div>
        </div>
        {/* Hot Leads quick filter */}
        <button
          type="button"
          onClick={isHotFilter ? clearFilters : activateHotFilter}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={
            isHotFilter
              ? {
                  background: "linear-gradient(135deg, #0D2137 0%, #1B3A6B 100%)",
                  color: "#67E8F9",
                  border: "1px solid #22D3EE",
                  boxShadow: "0 0 20px rgba(34,211,238,0.25)",
                }
              : {
                  background: "rgba(34,211,238,0.08)",
                  color: "#22D3EE",
                  border: "1px solid rgba(34,211,238,0.25)",
                }
          }
        >
          🔥 Horúce príležitosti
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{
              background: isHotFilter ? "rgba(34,211,238,0.25)" : "rgba(34,211,238,0.15)",
              color: "#22D3EE",
            }}
          >
            {hotCount}
          </span>
          {isHotFilter && <span className="text-[11px] opacity-70">✕ zrušiť</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Hľadať
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Meno, email, lokalita..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Stav
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Všetky stavy</option>
            {statuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Lokalita
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Všetky lokality</option>
            {locations.map((locationOption) => (
              <option key={locationOption} value={locationOption}>
                {locationOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Minimálne score
          </label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min="0"
            max="100"
            placeholder="napr. 70"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tím
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Všetky tímy</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Agent
          </label>
          <select
            value={assignedProfileId}
            onChange={(e) => setAssignedProfileId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Všetci agenti</option>
            {activeProfiles
              .filter((profile) => !teamId || profile.teamId === teamId)
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Vymazať filtre
        </button>
      </div>
    </div>
  );
}