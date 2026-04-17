import { NextResponse } from "next/server";
import { INCIDENT_SEVERITY_MAP, OBSERVABILITY_RULES } from "@/lib/observability-rules";

export async function GET() {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    rules: OBSERVABILITY_RULES,
    severityMap: INCIDENT_SEVERITY_MAP,
  });
}
