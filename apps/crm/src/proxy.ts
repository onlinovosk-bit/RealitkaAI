import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isInvalidRefreshTokenError } from "@/lib/supabase/auth-session";

// Public routes — no auth required
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/auth/callback",
  "/auth/confirm",
  "/api/healthz",
  "/api/demo/request",
  "/api/demo/capture-lead",
  "/api/demo/estimate",
  "/api/demo/prefill-links",
  "/api/billing/webhook",
  "/api/integrations/google/callback",
  "/api/webhooks/hubspot",
]);

const CRON_PATH_PREFIX = "/api/agents";
const CRON_API_PATH_PREFIX = "/api/cron/";
const SCORING_CRON_PATHS = ["/api/scoring"];
/** 410 Gone shims — bypass session gate so callers receive deprecated response. */
const DEPRECATED_API_SHIMS = new Set(["/api/scoring", "/api/segmentation"]);
/** Removed routes — let Next return 404 (no session gate). PR-4 scrape removal. */
const REMOVED_API_PATHS = new Set(["/api/scrape"]);
const WEBHOOK_API_SEGMENT = "/api/webhooks";
/** Onboarding MVP APIs — service-role in route handlers; bypass session gate for SSR/cron callers. */
const ONBOARDING_MVP_PREFIX = "/api/onboarding/mvp/";

function isRealviaImportPath(pathname: string): boolean {
  return pathname === "/api/realvia/import" || pathname === "/api/realvia/import/";
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
  if (isWebhookApiPath(pathname)) return NextResponse.next();
  if (REMOVED_API_PATHS.has(pathname)) return NextResponse.next();
  if (DEPRECATED_API_SHIMS.has(pathname)) return NextResponse.next();
  if (isCronRoute(pathname)) return NextResponse.next();
  if (pathname.startsWith(ONBOARDING_MVP_PREFIX)) return NextResponse.next();

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
