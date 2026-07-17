import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function getKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

/**
 * PKCE code exchange fallback (OAuth / some ConfirmationURL redirects).
 * Prefer /auth/confirm?token_hash=... for recovery emails.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/reset-password";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/reset-password";

  const successUrl = request.nextUrl.clone();
  successUrl.pathname = next;
  successUrl.search = "";

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/reset-password";
  errorUrl.search = "";
  errorUrl.searchParams.set("error", "invalid_or_expired");

  if (!code) {
    return NextResponse.redirect(errorUrl);
  }

  let redirectResponse = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          redirectResponse = NextResponse.redirect(successUrl);
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(errorUrl);
  }

  return redirectResponse;
}
