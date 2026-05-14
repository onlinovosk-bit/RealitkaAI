import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  appendTenantHeadersToRequest,
  type TenantForwardContext,
} from "./tenant-headers";

export * from "./tenant-headers";

/**
 * Builds a NextResponse that forwards merged tenant headers on the request.
 * Re-apply Supabase cookie writes by passing the same `supabase` client that
 * was constructed with `setAll` targeting `response`.
 *
 * Use this at the end of API middleware after session refresh, so cookies stay
 * on the returned response.
 */
export function nextResponseWithForwardedTenant(
  request: NextRequest,
  tenant: TenantForwardContext,
  baseResponse: NextResponse,
): NextResponse {
  const forwarded = appendTenantHeadersToRequest(request.headers, tenant);
  const response = NextResponse.next({
    request: { headers: forwarded },
  });

  baseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}
