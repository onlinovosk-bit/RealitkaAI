import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import { safeServerAction } from "@/lib/safe-action";
import { listOutreachMessages } from "@/lib/outreach-store";
import { listLeads } from "@/lib/leads-store";
import { requireRole } from "@/lib/permissions";
import Link from "next/link";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function directionBadge(direction: string) {
  if (direction === "inbound") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
        Inbound
      </span>
    );
  }
  return (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
      Outbound
    </span>
  );
}

function channelBadge(channel: string) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {channel}
    </span>
  );
}

export default async function CommunicationPage() {
  await requireRole(["owner", "manager", "agent"]);

  const result = await safeServerAction(
    async () => {
      const [messages, leads] = await Promise.all([
        listOutreachMessages(),
        listLeads(),
      ]);
      return { messages, leads };
    },
    "Nepodarilo sa nacitat komunikaciu."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Komunikácia"
        description="Prehľad všetkých správ medzi maklérmi a klientmi."
      >
        <ErrorState
          title="Komunikaciu sa nepodarilo nacitat"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { messages, leads } = result.data;

  const rows = messages.map((msg) => {
    const lead = leads.find((l) => l.id === msg.leadId);
    return { ...msg, leadName: lead?.name ?? null };
  });

  const inboundCount = rows.filter((r) => r.direction === "inbound").length;
  const outboundCount = rows.filter((r) => r.direction === "outbound").length;
  const aiCount = rows.filter((r) => r.aiGenerated).length;
  const uniqueLeads = new Set(rows.map((r) => r.leadId).filter(Boolean)).size;

  return (
    <ModuleShell
      title="Komunikácia"
      description="Prehľad všetkých správ medzi maklérmi a klientmi."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Celkovo správ</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{rows.length}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Prijaté (Inbound)</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{inboundCount}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Odoslané (Outbound)</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{outboundCount}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">AI vygenerovaných</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{aiCount}</h2>
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title="Zatiaľ žiadne správy"
          description="Správy sa zobrazia po prvom outreach alebo prijatom kontakte."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Všetky správy</h2>
            <p className="text-sm text-gray-500">
              {uniqueLeads} príležitostí, {rows.length} správ celkovo.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Smer</th>
                  <th className="px-5 py-3 font-medium">Kanál</th>
                  <th className="px-5 py-3 font-medium">Odosielateľ</th>
                  <th className="px-5 py-3 font-medium">Obsah</th>
                  <th className="px-5 py-3 font-medium">Dátum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {row.leadId ? (
                        <Link
                          href={`/leads/${row.leadId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {row.leadName ?? row.leadId}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">{directionBadge(row.direction)}</td>
                    <td className="px-5 py-4">{channelBadge(row.channel)}</td>
                    <td className="px-5 py-4 text-gray-700">
                      {row.senderName || row.senderEmail || "-"}
                    </td>
                    <td className="max-w-xs px-5 py-4 text-gray-600">
                      <span className="line-clamp-2">{row.content || "-"}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-500">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
