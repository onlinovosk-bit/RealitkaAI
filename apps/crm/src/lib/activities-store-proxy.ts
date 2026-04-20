import { createClient } from "@/lib/supabase/server";
export async function createActivity(data: {
  lead_id: string;
  type: string;
  note?: string;
  agent_id?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert(data);
  if (error) throw error;
}
