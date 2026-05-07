import { getSupabaseClient } from "@/lib/supabase/client";

export type SchemaCheck = {
  key: string;
  label: string;
  ok: boolean;
  message: string;
};

async function checkTableColumns(
  table: string,
  columns: string,
  label: string
): Promise<SchemaCheck> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      key: `${table}-schema`,
      label,
      ok: true,
      message: "Supabase nie je pripojeny. Schema check preskoceny.",
    };
  }

  const { error } = await supabase
    .from(table)
    .select(columns)
    .limit(1);

  if (error) {
    return {
      key: `${table}-schema`,
      label,
      ok: false,
      message: error.message,
    };
  }

  return {
    key: `${table}-schema`,
    label,
    ok: true,
    message: `OK (${table}: ${columns})`,
  };
}

export async function runCoreSchemaValidation(): Promise<{
  ok: boolean;
  checks: SchemaCheck[];
}> {
  const checks = await Promise.all([
    checkTableColumns(
      "properties",
      "id,title,location,price,type,rooms,features,status,created_at",
      "Schema: Properties"
    ),
    checkTableColumns(
      "lead_property_matches",
      "id,lead_id,property_id,score,status,created_at",
      "Schema: Matching"
    ),
    checkTableColumns(
      "ai_recommendations",
      "id,lead_id,recommendation_type,title,description,priority,status,model_version,created_at",
      "Schema: Recommendations"
    ),
  ]);

  return {
    ok: checks.every((item) => item.ok),
    checks,
  };
}
