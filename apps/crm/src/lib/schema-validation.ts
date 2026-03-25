import { createClient } from "@supabase/supabase-js";

export type SchemaCheck = {
  key: string;
  label: string;
  ok: boolean;
  message: string;
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

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
