import { listAssignmentRules, autoAssignLeads } from "@/lib/lead-automation-store";
import { listProfiles } from "@/lib/team-store";
import AssignmentRulesPanel from "@/components/automation/assignment-rules-panel";

export default async function AutomationPage() {
  const [rules, profiles] = await Promise.all([
    listAssignmentRules(),
    listProfiles(),
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
