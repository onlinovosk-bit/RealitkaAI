"use client";

import { useState, useEffect, useMemo } from "react";
import { type Lead } from "@/lib/leads-store";

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

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Filtre</h2>
          <p className="mt-0.5 text-xs text-slate-500">Komu volať ako prvému?</p>
        </div>
        <button
          type="button"
          onClick={isHotFilter ? clearFilters : activateHotFilter}
          className={
            "inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 " +
            (isHotFilter
              ? "border border-orange-300 bg-orange-50 text-orange-700"
              : "border border-orange-200 bg-white text-orange-600 hover:bg-orange-50")
          }
        >
          Horúce príležitosti
          <span
            className={
              "rounded-full px-2 py-0.5 text-[11px] font-bold " +
              (isHotFilter ? "bg-orange-100 text-orange-800" : "bg-orange-50 text-orange-700")
            }
          >
            {hotCount}
          </span>
          {isHotFilter && <span className="text-[11px] opacity-80">zrušiť</span>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="col-span-2 md:col-span-1 xl:col-span-1">
          <label className={labelClass}>Hľadať</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Meno, email..."
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Stav</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
            <option value="">Všetky</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Lokalita</label>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass}>
            <option value="">Všetky</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Min. BRI</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min="0" max="100"
            placeholder="70"
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Tím</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={fieldClass}>
            <option value="">Všetky</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Agent</label>
          <select value={assignedProfileId} onChange={(e) => setAssignedProfileId(e.target.value)} className={fieldClass}>
            <option value="">Všetci</option>
            {activeProfiles.filter((p) => !teamId || p.teamId === teamId).map((p) => (
              <option key={p.id} value={p.id}>{p.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={clearFilters}
          className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Vymazať filtre
        </button>
      </div>
    </div>
  );
}