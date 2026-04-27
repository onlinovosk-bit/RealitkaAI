import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/team/permissions") {
    return NextResponse.redirect(new URL("/dashboard", request.url), 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/team/permissions"],
};
