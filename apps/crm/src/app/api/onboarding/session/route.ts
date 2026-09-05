import { NextResponse } from "next/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { isOnboardingSessionId } from "@/lib/onboarding/session-api";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { incrementUsageMetric } from "@/lib/usage-metrics";

export const runtime = "nodejs";

const MAX_FORM_DATA_BYTES = 64_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function parseStep(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 50) return null;
  return n;
}

function formDataTooLarge(formData: unknown): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(formData ?? null), "utf8") > MAX_FORM_DATA_BYTES;
  } catch {
    return true;
  }
}

/**
 * GET /api/onboarding/session?session_id=<uuid>
 * Returns one session by id. Never lists all sessions.
 */
export async function GET(request: Request) {
  try {
    const ip = clientIp(request);
    const { allowed } = await rateLimit(
      `onboarding-session-get:${ip}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!allowed) {
      return errorResponse("Príliš veľa pokusov.", 429);
    }

    const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() ?? "";
    if (!sessionId) {
      return errorResponse("session_id je povinný.", 400);
    }
    if (!isOnboardingSessionId(sessionId)) {
      return errorResponse("Neplatný session_id.", 400);
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return errorResponse("Služba nie je dostupná.", 503);
    }

    const { data, error } = await supabase
      .from("onboarding_sessions")
      .select("session_id, step, form_data, updated_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/onboarding/session]", error.message);
      return errorResponse(error.message, 500);
    }

    return okResponse({ session: data ?? null });
  } catch (error) {
    console.error("[GET /api/onboarding/session]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Chyba servera.",
      500,
    );
  }
}

/**
 * POST /api/onboarding/session
 * Upserts one session by session_id (service role). No bulk/list.
 */
export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const { allowed } = await rateLimit(
      `onboarding-session-post:${ip}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!allowed) {
      return errorResponse("Príliš veľa pokusov.", 429);
    }

    const body = (await request.json().catch(() => null)) as {
      session_id?: unknown;
      step?: unknown;
      form_data?: unknown;
      updated_at?: unknown;
    } | null;

    if (!body || typeof body !== "object") {
      return errorResponse("Neplatné telo požiadavky.", 400);
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!isOnboardingSessionId(sessionId)) {
      return errorResponse("Neplatný session_id.", 400);
    }

    const step = parseStep(body.step);
    if (step === null) {
      return errorResponse("Neplatný step.", 400);
    }

    if (formDataTooLarge(body.form_data)) {
      return errorResponse("form_data je príliš veľké.", 413);
    }

    const updatedAt =
      typeof body.updated_at === "string" && body.updated_at.trim()
        ? body.updated_at.trim()
        : new Date().toISOString();

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return errorResponse("Služba nie je dostupná.", 503);
    }

    const { data, error } = await supabase
      .from("onboarding_sessions")
      .upsert(
        {
          session_id: sessionId,
          step,
          form_data: body.form_data ?? {},
          updated_at: updatedAt,
        },
        { onConflict: "session_id" },
      )
      .select("session_id, step, form_data, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[POST /api/onboarding/session]", error.message);
      return errorResponse(error.message, 500);
    }

    return okResponse({ session: data });
  } catch (error) {
    console.error("[POST /api/onboarding/session]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Chyba servera.",
      500,
    );
  }
}

/** Explicit deny — listing all sessions must never exist. */
export async function PUT() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}