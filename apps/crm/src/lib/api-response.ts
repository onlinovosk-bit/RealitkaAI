import { NextResponse } from "next/server";

export function okResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    {
      ok: true,
      ...data,
    },
    init
  );
}

export function errorResponse(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(extra ?? {}),
    },
    { status }
  );
}
