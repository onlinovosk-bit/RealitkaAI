type PropertiesFiltersProps = {
  defaultQ?: string;
  defaultStatus?: string;
  defaultLocation?: string;
  defaultType?: string;
  statuses: string[];
  locations: string[];
  types: string[];
};

export default function PropertiesFilters({
  defaultQ = "",
  defaultStatus = "",
  defaultLocation = "",
  defaultType = "",
  statuses,
  locations,
  types,
}: PropertiesFiltersProps) {
  return (
    <form
      method="GET"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filtre nehnuteľností</h2>
        <p className="text-sm text-gray-500">
          Filtrovanie podľa stavu, lokality a typu.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Hľadať
          </label>
          <input
            type="text"
            name="q"
            defaultValue={defaultQ}
            placeholder="Názov, lokalita, vlastník..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Stav
          </label>
          <select
            name="status"
            defaultValue={defaultStatus}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Všetky stavy</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Lokalita
          </label>
          <select
            name="location"
            defaultValue={defaultLocation}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Všetky lokality</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Typ
          </label>
          <select
            name="type"
            defaultValue={defaultType}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Všetky typy</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Použiť filtre
        </button>

        <a
          href="/properties"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
