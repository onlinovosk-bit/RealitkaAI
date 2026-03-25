import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";
import { listTasks } from "@/lib/tasks-store";
import { listPersistedMatches } from "@/lib/matching-store";
import { listRecommendations } from "@/lib/recommendations-store";
import { getManagementDashboardData } from "@/lib/management-store";
import { getEnvironmentHealth } from "@/lib/app-env";
import { runCoreSchemaValidation } from "@/lib/schema-validation";

export type SmokeCheck = {
  key: string;
  label: string;
  ok: boolean;
  message: string;
};

export async function runSmokeTests(): Promise<{
  ok: boolean;
  checks: SmokeCheck[];
}> {
  const checks: SmokeCheck[] = [];

  try {
    const leads = await listLeads();
    checks.push({
      key: "leads-load",
      label: "Načítanie leadov",
      ok: true,
      message: `Načítaných leadov: ${leads.length}`,
    });
  } catch (error) {
    checks.push({
      key: "leads-load",
      label: "Načítanie leadov",
      ok: false,
      message: error instanceof Error ? error.message : "Leady sa nepodarilo načítať.",
    });
  }

  try {
    const properties = await listProperties();
    checks.push({
      key: "properties-load",
      label: "Načítanie nehnuteľností",
      ok: true,
      message: `Načítaných nehnuteľností: ${properties.length}`,
    });
  } catch (error) {
    checks.push({
      key: "properties-load",
      label: "Načítanie nehnuteľností",
      ok: false,
      message: error instanceof Error ? error.message : "Nehnuteľnosti sa nepodarilo načítať.",
    });
  }

  try {
    const tasks = await listTasks();
    checks.push({
      key: "tasks-load",
      label: "Načítanie úloh",
      ok: true,
      message: `Načítaných úloh: ${tasks.length}`,
    });
  } catch (error) {
    checks.push({
      key: "tasks-load",
      label: "Načítanie úloh",
      ok: false,
      message: error instanceof Error ? error.message : "Úlohy sa nepodarilo načítať.",
    });
  }

  try {
    const matches = await listPersistedMatches();
    checks.push({
      key: "matches-load",
      label: "Načítanie matching zhôd",
      ok: true,
      message: `Načítaných matching záznamov: ${matches.length}`,
    });
  } catch (error) {
    checks.push({
      key: "matches-load",
      label: "Načítanie matching zhôd",
      ok: false,
      message: error instanceof Error ? error.message : "Matching sa nepodarilo načítať.",
    });
  }

  try {
    const recommendations = await listRecommendations();
    checks.push({
      key: "recommendations-load",
      label: "Načítanie AI odporúčaní",
      ok: true,
      message: `Načítaných AI odporúčaní: ${recommendations.length}`,
    });
  } catch (error) {
    checks.push({
      key: "recommendations-load",
      label: "Načítanie AI odporúčaní",
      ok: false,
      message: error instanceof Error ? error.message : "AI odporúčania sa nepodarilo načítať.",
    });
  }

  try {
    const schema = await runCoreSchemaValidation();
    const failed = schema.checks.filter((item) => !item.ok);
    checks.push({
      key: "schema-core",
      label: "Schema: Properties + Matching + Recommendations",
      ok: schema.ok,
      message: schema.ok
        ? "Schema check pre klucove moduly je v poriadku."
        : `Schema check zlyhal: ${failed.map((item) => item.message).join(" | ")}`,
    });
  } catch (error) {
    checks.push({
      key: "schema-core",
      label: "Schema: Properties + Matching + Recommendations",
      ok: false,
      message: error instanceof Error ? error.message : "Schema check zlyhal.",
    });
  }

  try {
    const management = await getManagementDashboardData();
    checks.push({
      key: "management-load",
      label: "Načítanie management dashboardu",
      ok: true,
      message: `Management KPI: leady ${management.kpis.totalLeads}, úlohy ${management.kpis.openTasks}`,
    });
  } catch (error) {
    checks.push({
      key: "management-load",
      label: "Načítanie management dashboardu",
      ok: false,
      message: error instanceof Error ? error.message : "Management dashboard sa nepodarilo načítať.",
    });
  }

  try {
    const env = getEnvironmentHealth();
    checks.push({
      key: "system-env",
      label: "Diagnostika prostredia",
      ok: env.requiredOk,
      message: env.requiredOk
        ? "Povinné env premenné sú dostupné."
        : "Chýbajú povinné env premenné pre plný režim.",
    });
  } catch (error) {
    checks.push({
      key: "system-env",
      label: "Diagnostika prostredia",
      ok: false,
      message: error instanceof Error ? error.message : "Diagnostika prostredia zlyhala.",
    });
  }

  return {
    ok: checks.every((item) => item.ok),
    checks,
  };
}
