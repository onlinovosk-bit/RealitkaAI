import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import PropertiesPageClient from "@/components/properties/properties-page-client";
import { loadPropertiesInventory, type PropertyFilters } from "@/lib/properties-store";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { safeServerAction } from "@/lib/safe-action";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    location?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  const filters: PropertyFilters = {
    q: (params.q ?? "").trim(),
    status: (params.status ?? "").trim(),
    location: (params.location ?? "").trim(),
    type: (params.type ?? "").trim(),
  };

  const result = await safeServerAction(
    async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let profileMissingAgency = false;
      let inventorySummary = undefined;

      if (user) {
        const { profileMissingAgency: missing } = await resolveProfileForAuthUser(
          supabase,
          user.id,
          "agency_id",
        );
        profileMissingAgency = missing;

        const { summary } = await loadPropertiesInventory(supabase);
        inventorySummary = summary;
      }

      return { inventorySummary, profileMissingAgency };
    },
    "Nepodarilo sa načítať nehnuteľnosti.",
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Nehnuteľnosti"
        description="Kompletný modul na správu nehnuteľností a ponúk realitnej kancelárie."
      >
        <ErrorState
          title="Nehnuteľnosti sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { inventorySummary, profileMissingAgency } = result.data;

  return (
    <ModuleShell
      title="Nehnuteľnosti"
      description="Kompletný modul na správu nehnuteľností a ponúk realitnej kancelárie."
    >
      <PropertiesPageClient
        initialInventorySummary={inventorySummary}
        profileMissingAgency={profileMissingAgency}
        filters={filters}
      />
    </ModuleShell>
  );
}
