import { NextRequest, NextResponse } from "next/server";
import { handleUcImportPost, ucImportHealth } from "@/lib/uc/import-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** UC Export API alias — same protocol as /api/uc/import (Brief 10 + 14). */
export async function POST(request: NextRequest) {
  return handleUcImportPost(request, "realsoft-import");
}

export async function GET() {
  return NextResponse.json(ucImportHealth("realsoft-import"));
}
