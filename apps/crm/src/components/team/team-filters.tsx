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
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <label className="text-sm font-medium text-gray-700">Filtrovať podľa tímu:</label>
      <select
        value={selectedTeamId}
        onChange={handleChange}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
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
