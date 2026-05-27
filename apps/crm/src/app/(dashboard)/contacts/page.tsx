import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import LeadsPageClient from "@/components/leads/leads-page-client";
import { safeServerAction } from "@/lib/safe-action";
import { bootstrapLeadsPage } from "@/lib/leads/leads-page-bootstrap";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ContactsPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const isShared = params.scope === "shared";

  const result = await safeServerAction(
    async () => {
      const supabase = await createClient();
      return bootstrapLeadsPage(supabase);
    },
    "Nepodarilo sa načítať klientov.",
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Moji klienti"
        description="Zoznam klientov a príležitostí vašej kancelárie."
      >
        <ErrorState
          title="Klientov sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { profileMissingAgency, initialLeadCount } = result.data;

  return (
    <ModuleShell
      title={isShared ? "Zdieľaní klienti" : "Moji klienti"}
      description={
        isShared
          ? "Príležitosti zdieľané v rámci kancelárie."
          : "Zoznam klientov a príležitostí vašej kancelárie."
      }
    >
      <LeadsPageClient
        profileMissingAgency={profileMissingAgency}
        initialLeadCount={initialLeadCount}
      />
    </ModuleShell>
  );
}
