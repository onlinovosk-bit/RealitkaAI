import type { Property } from "@/lib/properties-store";

function getStatusBadge(status: string) {
  switch (status) {
    case "Aktívna":
      return "bg-green-100 text-green-700";
    case "Rezervovaná":
      return "bg-yellow-100 text-yellow-700";
    case "Predaná":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function PropertiesTable({
  properties,
  onEdit,
}: {
  properties: Property[];
  onEdit?: (property: Property) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Nehnuteľnosti</h2>
        <p className="text-sm text-gray-500">
          Prehľad inventory s rýchlou editáciou.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Názov</th>
              <th className="px-5 py-3 font-medium">Lokalita</th>
              <th className="px-5 py-3 font-medium">Cena</th>
              <th className="px-5 py-3 font-medium">Typ</th>
              <th className="px-5 py-3 font-medium">Izby</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium">Vlastník</th>
              <th className="px-5 py-3 font-medium text-right">Akcia</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {properties.map((property) => (
              <tr key={property.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{property.title}</td>
                <td className="px-5 py-4 text-gray-700">{property.location}</td>
                <td className="px-5 py-4 text-gray-700">
                  {property.price.toLocaleString("sk-SK")} €
                </td>
                <td className="px-5 py-4 text-gray-700">{property.type}</td>
                <td className="px-5 py-4 text-gray-700">{property.rooms}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(property.status)}`}>
                    {property.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">{property.ownerName || "-"}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit?.(property)}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Detail / edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
