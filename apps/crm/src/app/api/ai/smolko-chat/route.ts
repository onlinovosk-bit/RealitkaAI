import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { getCurrentProfile } from "@/lib/auth";
import { listLeads } from "@/lib/leads-store";
import { answerSmolkoChatQuestion } from "@/lib/smolko-chatbot";
import { createClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/tasks-store";
import { incrementUsageMetric } from "@/lib/usage-metrics";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  question: z.string().trim().min(3, "Otázka musí mať aspoň 3 znaky.").max(280, "Otázka je príliš dlhá."),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const profile = await getCurrentProfile();
  if (!profile?.agency_id) {
    return errorResponse("Chýba tenant profil pre chat asistenta.", 403);
  }

  const parsed = await validateBody(req, BodySchema);
  if (!parsed.ok) return parsed.response;

  const [leads, tasks] = await Promise.all([
    listLeads(undefined, supabase, { limit: 200 }),
    listTasks(supabase),
  ]);

  const answer = answerSmolkoChatQuestion({
    question: parsed.data.question,
    leads,
    tasks,
  });

  await incrementUsageMetric({
    agencyId: profile.agency_id,
    metric: "ai_chatbot_queries",
  });

  return okResponse({ answer });
}
