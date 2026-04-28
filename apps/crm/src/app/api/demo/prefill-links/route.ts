import { randomUUID } from "crypto";
import { errorResponse, okResponse } from "@/lib/api-response";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function unauthorized() {
  return errorResponse("Neautorizované.", 401);
}

function isAuthorized(req: Request) {
  const expected = process.env.DEMO_PREFILL_ADMIN_TOKEN?.trim();
  if (!expected) return false;
  const provided = req.headers.get("x-demo-admin-token")?.trim();
  return provided === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const supabase = createServiceRoleClient();
  if (!supabase) return errorResponse("Service role nie je nakonfigurovaný.", 500);

  const body = (await request.json()) as {
    agency?: string;
    rep?: string;
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    agents?: number;
    expiresInHours?: number;
  };

  const agency = (body.agency ?? "").trim();
  if (!agency) return errorResponse("agency je povinné.", 400);

  const token = randomUUID().replace(/-/g, "").slice(0, 20);
  const expiresInHours =
    Number.isFinite(Number(body.expiresInHours)) && Number(body.expiresInHours) > 0
      ? Number(body.expiresInHours)
      : 72;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("demo_prefill_links").insert({
    token,
    agency,
    rep: body.rep?.trim() || null,
    name: body.name?.trim() || null,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    city: body.city?.trim() || null,
    agents: Number.isFinite(Number(body.agents)) ? Number(body.agents) : null,
    expires_at: expiresAt,
  });

  if (error) return errorResponse(error.message, 500);

  return okResponse({
    token,
    expiresAt,
    linkPath: `/demo/live?sid=${token}`,
  });
}

