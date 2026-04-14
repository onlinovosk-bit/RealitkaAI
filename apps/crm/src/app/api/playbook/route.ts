/**
 * GET /api/playbook?scope=today|week
 *
 * Generuje AI Playbook pomocou BRI engine a reálnych Supabase dát.
 * Tok: Supabase leady + aktivity → computeBuyerReadiness() → filter ≥70 → sort DESC
 */

import { okResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { generateDailyPlaybook } from "@/services/simulator/daySimulator";
import type { PlaybookResponse } from "@/services/playbook/types";
import { mockBusyDay } from "@/services/playbook/mock";

const SCOPE_VALUES = ["today", "week"] as const;
type Scope = (typeof SCOPE_VALUES)[number];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawScope = searchParams.get("scope") ?? "today";
  const scope: Scope = SCOPE_VALUES.includes(rawScope as Scope)
    ? (rawScope as Scope)
    : "today";

  const supabase = await createClient();
  const limit = scope === "today" ? 15 : 40;

  let items = await generateDailyPlaybook(supabase, limit);

  // Fallback: keď v produkčných dátach dočasne nevyjde nič nad BRI prah,
  // zobrazíme aspoň akčné návrhy, aby Playbook neostal prázdny.
  if (items.length === 0) {
    items = scope === "today" ? mockBusyDay.slice(0, 9) : mockBusyDay.slice(0, 15);
  }

  const response: PlaybookResponse = {
    scope,
    items,
    generatedAt: new Date().toISOString(),
  };

  return okResponse(response);
}
