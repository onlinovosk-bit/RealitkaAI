import { errorResponse, okResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { listLeads } from "@/lib/leads-store";
import { answerSmolkoChatQuestion } from "@/lib/smolko-chatbot";
import { createClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/tasks-store";

export const dynamic = "force-dynamic";

type SmolkoChatRequest = {
  question?: unknown;
};

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

  let body: SmolkoChatRequest;
  try {
    body = (await req.json()) as SmolkoChatRequest;
  } catch {
    return errorResponse("Neplatné JSON telo požiadavky", 400);
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 3) {
    return errorResponse("Otázka musí mať aspoň 3 znaky.", 400);
  }
  if (question.length > 280) {
    return errorResponse("Otázka je príliš dlhá. Skráť ju pod 280 znakov.", 400);
  }

  const [leads, tasks] = await Promise.all([
    listLeads(undefined, supabase, { limit: 200 }),
    listTasks(supabase),
  ]);

  const answer = answerSmolkoChatQuestion({
    question,
    leads,
    tasks,
  });

  return okResponse({ answer });
}
