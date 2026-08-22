import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isInvalidRefreshTokenError } from "@/lib/supabase/auth-session";

// Public routes — no auth required
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/api/healthz",
  "/api/demo/request",
  "/api/demo/capture-lead",
  "/api/demo/estimate",
  "/api/demo/prefill-links",
  "/api/proof",
  "/proof",
  "/api/billing/webhook",
  "/api/integrations/google/callback",
  "/api/webhooks/hubspot",
  "/api/leads/inbound",
  "/api/acquire/email",
  "/api/acquisition/google/lead-webhook",
  "/api/valuation/submit",
  "/api/valuation/estimate",
]);

const CRON_PATH_PREFIX = "/api/agents";
const CRON_API_PATH_PREFIX = "/api/cron/";
/** Bearer CRON_SECRET routes outside /api/cron/ — bypass session gate like cron. */
const CRON_AUTH_API_PATHS = new Set([
  "/api/followup",
  "/api/inbound/gmail-pull",
]);
const SCORING_CRON_PATHS = ["/api/scoring"];
/** 410 Gone shims — bypass session gate so callers receive deprecated response. */
const DEPRECATED_API_SHIMS = new Set(["/api/scoring", "/api/segmentation"]);
/** Removed routes — let Next return 404 (no session gate). PR-4 scrape removal. */
const REMOVED_API_PATHS = new Set(["/api/scrape"]);
const WEBHOOK_API_SEGMENT = "/api/webhooks";
/**
 * Public onboarding wizard only (pre-login checklist + message schedule).
 * Admin CSM routes (at-risk PII dump, email dispatch) MUST stay session-gated —
 * they use service-role and previously leaked under the blanket /mvp/ bypass.
 */
const ONBOARDING_MVP_PUBLIC_PATHS = new Set([
  "/api/onboarding/mvp/checklist",
  "/api/onboarding/mvp/messages/schedule",
]);

export const PROXY_AUTH_TIMEOUT_MS = 5_000;
export const PROXY_AUTH_TIMEOUT_MARKER = "[proxy-auth-timeout]";

export function createProxyFetch(timeoutMs = PROXY_AUTH_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;
    return fetch(input, { ...init, signal });
  };
}

export function isProxyAuthTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function isRealviaImportPath(pathname: string): boolean {
  return pathname === "/api/realvia/import" || pathname === "/api/realvia/import/";
}

function isUcExportImportPath(pathname: string): boolean {
  return (
    pathname === "/api/uc/import" ||
    pathname === "/api/uc/import/" ||
    pathname === "/api/realsoft/import" ||
    pathname === "/api/realsoft/import/"
  );
}

function isWebhookApiPath(pathname: string): boolean {
  return (
    pathname === WEBHOOK_API_SEGMENT ||
    pathname.startsWith(`${WEBHOOK_API_SEGMENT}/`)
  );
}

const PUBLIC_STATIC_FILES = new Set([
  "/manifest.json",
  "/sw.js",
  "/revolis-widget.js",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/odhad/")) return true;
  if (PUBLIC_STATIC_FILES.has(pathname)) return true;
  if (pathname.startsWith("/api/healthz")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/logos/")) return true;
  return false;
}

function isCronRoute(pathname: string): boolean {
  if (CRON_AUTH_API_PATHS.has(pathname)) return true;
  if (pathname.startsWith(CRON_PATH_PREFIX)) return true;
  if (pathname.startsWith(CRON_API_PATH_PREFIX)) return true;
  return SCORING_CRON_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy team/permissions URL
  if (pathname === "/team/permissions" || pathname.startsWith("/team/permissions/")) {
    return NextResponse.redirect(new URL("/dashboard/reputation/integrity", request.url), 308);
  }

  if (isPublic(pathname)) return NextResponse.next();
  if (isRealviaImportPath(pathname)) return NextResponse.next();
  if (isUcExportImportPath(pathname)) return NextResponse.next();
  if (isWebhookApiPath(pathname)) return NextResponse.next();
  if (REMOVED_API_PATHS.has(pathname)) return NextResponse.next();
  if (DEPRECATED_API_SHIMS.has(pathname)) return NextResponse.next();
  if (isCronRoute(pathname)) return NextResponse.next();
  if (ONBOARDING_MVP_PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      global: { fetch: createProxyFetch() },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (err) {
    if (isProxyAuthTimeoutError(err)) {
      console.error(PROXY_AUTH_TIMEOUT_MARKER, pathname);
      // Pages: fail-open so SSR/layout can re-check auth (avoids 300s hang).
      // APIs: fail-closed — several handlers rely on this gate and use
      // service-role clients without a second getUser() (e.g. import/test-xml
      // when IMPORT_TEST_API_KEY is unset, neighborhood-watch).
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
      return response;
    }
    throw err;
  }

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (
    !user &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/app") ||
      pathname === "/properties" ||
      pathname.startsWith("/properties/"))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|revolis-widget\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
