import { NextRequest, NextResponse } from "next/server";
import { buildStarterPackHtmlBundle } from "@/lib/starter-pack/bundle";
import { verifyStarterPackDownloadToken } from "@/lib/starter-pack/download-token";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const stripeSessionId = verifyStarterPackDownloadToken(token);
  if (!stripeSessionId) {
    return new NextResponse("Invalid or expired link", { status: 403 });
  }

  const supabase = createServiceRoleClient();
  if (supabase) {
    const { data: row } = await supabase
      .from("credit_redemption_codes")
      .select("id")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();

    if (!row) {
      return new NextResponse("Purchase not found", { status: 404 });
    }
  }

  const html = buildStarterPackHtmlBundle();
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
