import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import LeadsPageClient from "@/components/leads/leads-page-client";
import { safeServerAction } from "@/lib/safe-action";
import { bootstrapLeadsPage } from "@/lib/leads/leads-page-bootstrap";
import { createClient } from "@/lib/supabase/server";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;

  const result = await safeServerAction(
    async () => {
      const supabase = await createClient();
      return bootstrapLeadsPage(supabase);
    },
    "Nepodarilo sa načítať príležitosti.",
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Príležitosti"
        description="Profesionálny prehľad klientov, priorít a AI odporúčaní."
      >
        <ErrorState
          title="Príležitosti sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { profileMissingAgency, initialLeadCount } = result.data;

  return (
    <ModuleShell
      title={scope === "team" ? "Leady kolegov" : "Príležitosti"}
      description="Profesionálny prehľad klientov, priorít a AI odporúčaní."
    >
      {scope === "team" && (
        <div
          className="mb-4 rounded-lg px-4 py-2 text-sm"
          style={{
            background: SLATE_HORIZON.soft,
            border: `1px solid ${SLATE_HORIZON.softBorder}`,
            color: SLATE_HORIZON.brandDeep,
          }}
        >
          Zobrazujú sa príležitosti pridelené kolegom vo vašom tíme.
        </div>
      )}
      <LeadsPageClient
        profileMissingAgency={profileMissingAgency}
        initialLeadCount={initialLeadCount}
      />
    </ModuleShell>
  );
}
