import AssignmentRulesPanel from "@/components/automation/assignment-rules-panel";
import { listAssignmentRules } from "@/lib/lead-automation-store";
import { listProfiles } from "@/lib/team-store";
import { getRscSupabase } from "@/lib/supabase/rsc-client";

export default async function AutomationPage() {
  const supabase = await getRscSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("agency_id")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  const agencyId = profile?.agency_id ?? null;

  const [rules, profiles] = await Promise.all([
    agencyId ? listAssignmentRules(agencyId, supabase) : Promise.resolve([]),
    listProfiles(supabase),
  ]);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Automatizácia Priraďovania</h1>
          <p className="mt-1 text-gray-500">
            Nakonfiguruj pravidlá na automatické priraďovanie nových príležitostí agentom.
          </p>
        </div>

        <AssignmentRulesPanel
          initialRules={rules}
          profiles={profiles.filter((p) => p.role === "agent" || p.role === "manager")}
        />
      </div>
    </main>
  );
}
