"use client";

import { useState, useEffect, useMemo } from "react";
import { type Lead } from "@/lib/leads-store";
import { SLATE_HORIZON, WORKDESK_INPUT, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

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

  const selectStyle = {
    background: WORKDESK_INPUT.background,
    borderColor: WORKDESK_INPUT.borderColor,
    color: WORKDESK_INPUT.color,
  };
  const inputStyle = selectStyle;
  const labelStyle = { color: SLATE_HORIZON.muted };

  return (
    <div
      className="rounded-2xl border p-4 md:p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900" style={{ color: SLATE_HORIZON.ink }}>Filtre</h2>
        </div>
        {/* Hot Leads quick filter */}
        <button
          type="button"
          onClick={isHotFilter ? clearFilters : activateHotFilter}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={
            isHotFilter
              ? {
                  background: SLATE_HORIZON.soft,
                  color: SLATE_HORIZON.brandDeep,
                  border: `1px solid ${SLATE_HORIZON.softBorder}`,
                  boxShadow: "0 4px 16px rgba(37,99,235,0.12)",
                }
              : {
                  background: SLATE_HORIZON.bg,
                  color: SLATE_HORIZON.brandDeep,
                  border: `1px solid ${WORKDESK_INPUT.borderColor}`,
                }
          }
        >
          🔥 Horúce príležitosti
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{
              background: isHotFilter ? SLATE_HORIZON.softBorder : SLATE_HORIZON.soft,
              color: SLATE_HORIZON.brandDeep,
            }}
          >
            {hotCount}
          </span>
          {isHotFilter && <span className="text-[11px] opacity-70">✕ zrušiť</span>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="col-span-2 md:col-span-1 xl:col-span-1">
          <label className="mb-1 block text-xs font-medium" style={labelStyle}>Hľadať</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Meno, email..."
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={labelStyle}>Stav</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={selectStyle}>
            <option value="">Všetky</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={labelStyle}>Lokalita</label>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={selectStyle}>
            <option value="">Všetky</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={labelStyle}>Min. BRI</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min="0" max="100"
            placeholder="Všetky"
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={labelStyle}>Tím</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={selectStyle}>
            <option value="">Všetky</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={labelStyle}>Agent</label>
          <select value={assignedProfileId} onChange={(e) => setAssignedProfileId(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={selectStyle}>
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
          className="rounded-xl border px-4 py-2 text-xs font-medium min-h-[36px]"
          style={{ borderColor: WORKDESK_INPUT.borderColor, color: SLATE_HORIZON.muted }}
        >
          Vymazať filtre
        </button>
      </div>
    </div>
  );
}