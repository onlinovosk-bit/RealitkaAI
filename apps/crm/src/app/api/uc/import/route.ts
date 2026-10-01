import { NextRequest, NextResponse } from "next/server";
import { handleUcImportPost, ucImportHealth } from "@/lib/uc/import-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleUcImportPost(request, "uc-import");
}

export async function GET() {
  return NextResponse.json(ucImportHealth("uc-import"));
}
