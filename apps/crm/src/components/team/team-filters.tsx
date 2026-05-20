"use client";

import { useRouter } from "next/navigation";

type TeamOption = { id: string; name: string };

export default function TeamFilters({
  visibleTeams,
  selectedTeamId,
}: {
  visibleTeams: TeamOption[];
  selectedTeamId: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set("teamId", value);
    } else {
      url.searchParams.delete("teamId");
    }
    router.push(url.pathname + url.search);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-blue-950/5 sm:flex-row sm:items-center">
      <label className="text-sm font-medium text-slate-700">Filtrovať podľa tímu:</label>
      <select
        value={selectedTeamId}
        onChange={handleChange}
        className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0 sm:py-1.5"
      >
        <option value="">Všetky tímy</option>
        {visibleTeams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
