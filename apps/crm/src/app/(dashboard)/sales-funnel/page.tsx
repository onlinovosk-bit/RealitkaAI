import { getSalesFunnelData } from "@/lib/sales-funnel-store";
import SaasLeadsTable from "@/components/sales-funnel/saas-leads-table";

export const metadata = { title: "Sales Funnel | Realitka AI" };

export default async function SalesFunnelPage() {
  const { kpis, leads } = await getSalesFunnelData();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Sales Funnel</h1>
      <p className="mt-1 text-sm text-gray-500">
        SaaS demo requesty od realitných kancelárií
      </p>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiCard label="Celkom" value={kpis.total} />
        <KpiCard label="Noví" value={kpis.newCount} color="blue" />
        <KpiCard label="Demo zarezervované" value={kpis.demoBooked} color="violet" />
        <KpiCard label="Vyhraté" value={kpis.won} color="green" />
        <KpiCard label="Priem. agentov" value={kpis.avgAgents} />
      </div>

      {/* Table */}
      <div className="mt-8">
        <SaasLeadsTable initialLeads={leads} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value: number;
  color?: "gray" | "blue" | "violet" | "green";
}) {
  const colors = {
    gray: "bg-white border-gray-200 text-gray-900",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    green: "bg-green-50 border-green-200 text-green-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
