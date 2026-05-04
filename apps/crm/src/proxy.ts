import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
const SCORING_CRON_PATHS = ["/api/scoring", "/api/segmentation"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/healthz")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/images")) return true;
  return false;
}

function isCronRoute(pathname: string): boolean {
  if (pathname.startsWith(CRON_PATH_PREFIX)) return true;
  return SCORING_CRON_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy team/permissions URL
  if (pathname === "/team/permissions" || pathname.startsWith("/team/permissions/")) {
    return NextResponse.redirect(new URL("/dashboard/reputation/integrity", request.url), 308);
  }

  if (isPublic(pathname)) return NextResponse.next();
  if (isCronRoute(pathname)) return NextResponse.next();

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/app"))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
