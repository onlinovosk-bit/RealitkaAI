import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import {
  isOnboardingSessionId,
  isOnboardingSessionWithinMaxAge,
  ONBOARDING_SESSION_MAX_AGE_MS,
} from "@/lib/onboarding/session-api";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Permissive on purpose. The precise rules — session id shape, step range,
 * form_data size with its own 413 — are below and keep their Slovak messages
 * and status codes. This only replaces the inline `request.json().catch()`
 * with the shared parser the API contract expects.
 */
const SessionPostBodySchema = z.record(z.string(), z.unknown());

const MAX_FORM_DATA_BYTES = 64_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Capability URLs must not leak session_id via Referer to third parties. */
function withCapabilityHeaders(res: NextResponse): NextResponse {
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

function sessionMaxAgeCutoffIso(nowMs: number = Date.now()): string {
  return new Date(nowMs - ONBOARDING_SESSION_MAX_AGE_MS).toISOString();
}

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
 * Capability lifetime: updated_at must be within ONBOARDING_SESSION_MAX_AGE_MS.
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
      return withCapabilityHeaders(errorResponse("Príliš veľa pokusov.", 429));
    }

    const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() ?? "";
    if (!sessionId) {
      return withCapabilityHeaders(errorResponse("session_id je povinný.", 400));
    }
    if (!isOnboardingSessionId(sessionId)) {
      return withCapabilityHeaders(errorResponse("Neplatný session_id.", 400));
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return withCapabilityHeaders(errorResponse("Služba nie je dostupná.", 503));
    }

    const cutoffIso = sessionMaxAgeCutoffIso();
    const { data, error } = await supabase
      .from("onboarding_sessions")
      .select("session_id, step, form_data, updated_at")
      .eq("session_id", sessionId)
      .gt("updated_at", cutoffIso)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/onboarding/session]", error.message);
      return withCapabilityHeaders(errorResponse(error.message, 500));
    }

    // Defense in depth: reject stale rows even if the DB filter was bypassed in tests/mocks.
    if (data && !isOnboardingSessionWithinMaxAge(data.updated_at as string | null | undefined)) {
      return withCapabilityHeaders(errorResponse("Session vypršala.", 404));
    }

    if (!data) {
      return withCapabilityHeaders(errorResponse("Session nenájdená alebo vypršala.", 404));
    }

    return withCapabilityHeaders(okResponse({ session: data }));
  } catch (error) {
    console.error("[GET /api/onboarding/session]", error);
    return withCapabilityHeaders(
      errorResponse(
        error instanceof Error ? error.message : "Chyba servera.",
        500,
      ),
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
      return withCapabilityHeaders(errorResponse("Príliš veľa pokusov.", 429));
    }

    const parsed = await validateBody(request, SessionPostBodySchema);
    if (!parsed.ok) {
      // validateBody's own response is returned bare, without the no-referrer
      // header this route puts on every reply. Dropping it on a 400 would leak
      // session_id through Referer to whatever the caller navigates to next —
      // the exact thing withCapabilityHeaders exists to prevent. So the route
      // keeps its own error, in Slovak, wrapped.
      return withCapabilityHeaders(errorResponse("Neplatné telo požiadavky.", 400));
    }
    const body = parsed.data;

    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!isOnboardingSessionId(sessionId)) {
      return withCapabilityHeaders(errorResponse("Neplatný session_id.", 400));
    }

    const step = parseStep(body.step);
    if (step === null) {
      return withCapabilityHeaders(errorResponse("Neplatný step.", 400));
    }

    if (formDataTooLarge(body.form_data)) {
      return withCapabilityHeaders(errorResponse("form_data je príliš veľké.", 413));
    }

    const updatedAt =
      typeof body.updated_at === "string" && body.updated_at.trim()
        ? body.updated_at.trim()
        : new Date().toISOString();

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return withCapabilityHeaders(errorResponse("Služba nie je dostupná.", 503));
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
      return withCapabilityHeaders(errorResponse(error.message, 500));
    }

    await incrementUsageMetric({
      agencyId: SYSTEM_USAGE_AGENCY_ID,
      metric: "onboarding_session",
    });

    return withCapabilityHeaders(okResponse({ session: data }));
  } catch (error) {
    console.error("[POST /api/onboarding/session]", error);
    return withCapabilityHeaders(
      errorResponse(
        error instanceof Error ? error.message : "Chyba servera.",
        500,
      ),
    );
  }
}

/** Explicit deny — listing all sessions must never exist. */
export async function PUT() {
  return withCapabilityHeaders(
    NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 }),
  );
}
