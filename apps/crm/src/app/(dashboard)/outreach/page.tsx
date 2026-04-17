import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LockedFeatureCard from "@/components/shared/locked-feature-card";
import FeatureGateBanner from "@/components/shared/feature-gate-banner";
import OutreachSendPanel from "@/components/outreach/outreach-send-panel";
import CampaignBuilder from "@/components/outreach/campaign-builder";
import OutreachLogTable from "@/components/outreach/outreach-log-table";
import FollowupSequencePanel from "@/components/outreach/followup-sequence-panel";
import OutboundPanel from "@/components/dashboard/OutboundPanel";
import { safeServerAction } from "@/lib/safe-action";
import { listLeads } from "@/lib/leads-store";
import { listOutreachMessages } from "@/lib/outreach-store";
import { requireRole } from "@/lib/permissions";
import { getFeatureGateState } from "@/lib/feature-gating";

export default async function OutreachPage() {
  await requireRole(["owner", "manager", "agent"]);

  const gate = await getFeatureGateState("outreach");

  if (!gate.enabled) {
    return (
      <ModuleShell
        title="Outreach"
        description="AI automaticky napíše a odošle email klientovi."
      >
        <LockedFeatureCard
          title="Outreach je zamknutý"
          description={gate.reason || "Outreach nie je dostupný pre aktuálny plán."}
        />
      </ModuleShell>
    );
  }

  const result = await safeServerAction(
    async () => {
      const [leads, messages] = await Promise.all([
        listLeads(),
        listOutreachMessages(),
      ]);
      return { leads, messages };
    },
    "Nepodarilo sa načítať outreach modul."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Outreach"
        description="AI automaticky napíše a odošle email klientovi."
      >
        <ErrorState
          title="Outreach sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { leads, messages } = result.data;

  const eligibleLeads = leads.filter((lead) => Boolean(lead.email));
  const rows = messages.map((msg) => {
    const lead = leads.find((item) => item.id === msg.leadId);
    return {
      id: msg.id,
      leadName: lead?.name ?? msg.leadId ?? "-",
      senderEmail: msg.senderEmail,
      content: msg.content,
      aiGenerated: msg.aiGenerated,
      createdAt: msg.createdAt,
    };
  });

  return (
    <ModuleShell
      title="Outreach"
      description="AI automaticky napíše a odošle email klientovi."
    >
      <FeatureGateBanner description="Outreach je aktivovaný v tvojom pláne." title="Outreach je aktívny" />

      <div className="mt-6">
        <OutboundPanel />
      </div>

      <section className="mt-6 mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Príležitosti s emailom</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{eligibleLeads.length}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Odoslané správy</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{rows.length}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">AI správy</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {rows.filter((row) => row.aiGenerated).length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Kanál</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">Email</h2>
        </div>
      </section>

      {eligibleLeads.length === 0 ? (
        <EmptyState
          title="Zatiaľ nemáš leady s emailom"
          description="Aby AI vedela automaticky posielať správy, lead musí mať vyplnený email."
        />
      ) : (
        <>
          <section className="mb-6">
            <CampaignBuilder />
          </section>
          <section className="mb-6">
            <FollowupSequencePanel />
          </section>
          <section className="mb-6">
            <OutreachSendPanel
              leads={eligibleLeads.map((lead) => ({
                id: lead.id,
                name: lead.name,
                email: lead.email,
                status: lead.status,
                score: lead.score,
              }))}
            />
          </section>
          <OutreachLogTable rows={rows} />
        </>
      )}
    </ModuleShell>
  );
}
