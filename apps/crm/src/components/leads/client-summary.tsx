import type { Lead } from "@/lib/mock-data";

export default function ClientSummary({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">AI sumár klienta</h2>
        <p className="text-sm text-gray-500">
          Rýchly profil klienta pre makléra.
        </p>
      </div>

      <div className="space-y-3 text-sm text-gray-700">
        <div className="rounded-xl bg-gray-50 p-4">
          <p>
            <span className="font-semibold">Hľadá:</span> {lead.propertyType}, {lead.rooms}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Lokalita:</span> {lead.location}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Rozpočet:</span> {lead.budget}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Financovanie:</span> {lead.financing}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Čas kúpy:</span> {lead.timeline}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-900">Odporúčanie AI</p>
          <p className="mt-2 text-gray-600">
            Tento lead má skóre <span className="font-semibold">{lead.score}/100</span>.
            Priorita kontaktu je vysoká, ak je skóre nad 80 a klient už reagoval na ponuky.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-900">Poznámka</p>
          <p className="mt-2 text-gray-600">{lead.note}</p>
        </div>
      </div>
    </div>
  );
}
