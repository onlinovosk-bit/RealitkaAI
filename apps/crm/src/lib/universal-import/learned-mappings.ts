import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  ColumnMapping,
  DetectedColumn,
  ImportSourceSystem,
} from "@/lib/universal-import/types";

export async function loadLearnedMappings(
  sourceCrm: ImportSourceSystem,
): Promise<ColumnMapping | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("migration_cases")
    .select("learned_mappings")
    .eq("source_crm", sourceCrm)
    .not("learned_mappings", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.learned_mappings || typeof data.learned_mappings !== "object") {
    return null;
  }

  return data.learned_mappings as ColumnMapping;
}

export function applyLearnedMappings(
  detectedColumns: DetectedColumn[],
  learned: ColumnMapping,
): DetectedColumn[] {
  return detectedColumns.map((column) => {
    const learnedTarget = learned[column.originalHeader];
    if (!learnedTarget) return column;

    return {
      ...column,
      target: learnedTarget,
      confidence: 0.99,
      source: "learned",
    };
  });
}
