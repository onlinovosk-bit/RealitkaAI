import { NextResponse } from "next/server";
import { FALLBACK_MATRIX } from "@/lib/fallback-matrix";

export async function GET() {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    matrix: FALLBACK_MATRIX,
  });
}
