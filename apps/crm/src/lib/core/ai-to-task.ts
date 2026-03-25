import { createClient } from "@/lib/supabase/server";

export async function createTaskFromRecommendation(rec: any) {
  const supabase = await createClient();

  await supabase.from("tasks").insert({
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    status: "open",
    lead_id: rec.leadId,
  });
}
