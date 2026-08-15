import { redirect } from "next/navigation";
import ModuleShell from "@/components/shared/module-shell";
import { createClient } from "@/lib/supabase/server";
import { loadAcquisitionDashboard, type DashboardSupabase } from "@/lib/acquisition/load-dashboard";
import type {
  DashboardAccount,
  DashboardCampaign,
  DashboardEvent,
} from "@/lib/acquisition/load-dashboard";

export const dynamic = "force-dynamic";

function formatTs(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(parsed));
}

function AccountsTable({ accounts }: { accounts: DashboardAccount[] }) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Žiadny Google Ads účet nie je k tomuto tenantovi pripojený.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">customer_id</th>
            <th className="py-2 pr-4 font-medium">MCC</th>
            <th className="py-2 pr-4 font-medium">Stav</th>
            <th className="py-2 pr-4 font-medium">Posledný sync</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-mono text-gray-900">
                {account.customer_id}
              </td>
              <td className="py-2 pr-4 font-mono text-gray-700">
                {account.manager_customer_id ?? "—"}
              </td>
              <td className="py-2 pr-4 text-gray-900">{account.status ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-700">
                {formatTs(account.last_sync_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignsTable({ campaigns }: { campaigns: DashboardCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        V CRM zatiaľ nie sú žiadne kampane. Ad groups, kľúčové slová a metriky
        Stage 0 nemajú tabuľky — overenie bolo cez read-only live sync, nie cez
        tento prehľad.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">Kampaň</th>
            <th className="py-2 pr-4 font-medium">Google ID</th>
            <th className="py-2 pr-4 font-medium">Stav</th>
            <th className="py-2 pr-4 font-medium">Sync</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 text-gray-900">{campaign.name ?? "—"}</td>
              <td className="py-2 pr-4 font-mono text-gray-700">
                {campaign.provider_campaign_id}
              </td>
              <td className="py-2 pr-4 text-gray-900">{campaign.status ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-700">
                {formatTs(campaign.last_synced_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsTable({ events }: { events: DashboardEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-600">Žiadne webhook eventy pre tento tenant.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">Event</th>
            <th className="py-2 pr-4 font-medium">Stav</th>
            <th className="py-2 pr-4 font-medium">lead_id</th>
            <th className="py-2 pr-4 font-medium">Prijaté</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-mono text-gray-700">
                {event.provider_event_id ?? event.event_type}
              </td>
              <td className="py-2 pr-4 text-gray-900">
                {event.processing_status ?? "—"}
              </td>
              <td className="py-2 pr-4 font-mono text-gray-700">
                {event.lead_id ?? "null"}
              </td>
              <td className="py-2 pr-4 text-gray-700">
                {formatTs(event.received_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AcquisitionDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.agency_id) {
    return (
      <ModuleShell
        title="Google Ads (test)"
        description="Tenant scope chýba — v profile nie je agency_id."
      >
        <p className="text-sm text-gray-600">
          Dashboard sa nedá zobraziť bez agency_id.
        </p>
      </ModuleShell>
    );
  }

  const dashboard = await loadAcquisitionDashboard(
    supabase as unknown as DashboardSupabase,
    profile.agency_id,
  );

  return (
    <ModuleShell
      title="Google Ads (test)"
      description="Pripojený testovací účet a načítané kampane. Revolis sem nič do Google Ads nezapisuje."
    >
      <p className="mb-6 text-sm text-gray-600">
        Test MCC neservuje reklamy, takže spend / CPL / ROI tu nezobrazujeme —
        neboli by to namerané čísla, len nuly. Ad groups, kľúčové slová a search
        terms Stage 0 nemajú DB tabuľky.
      </p>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Pripojené účty</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">
          {dashboard.accounts.length} Google Ads účtov
        </p>
        <AccountsTable accounts={dashboard.accounts} />
      </section>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Kampaňe</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">
          {dashboard.campaigns.length} riadkov v acquisition_campaigns
        </p>
        <CampaignsTable campaigns={dashboard.campaigns} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Webhook eventy</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">
          Poslednych {dashboard.events.length} Google eventov. is_test nezaklada
          CRM lead.
        </p>
        <EventsTable events={dashboard.events} />
      </section>
    </ModuleShell>
  );
}
