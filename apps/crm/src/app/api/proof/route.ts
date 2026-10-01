import { NextResponse } from "next/server";
import { validateBody } from "@/lib/api-validate";
import { errorResponse, okResponse } from "@/lib/api-response";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { computeProofReport } from "@/lib/proof/engine";
import { proofSubmitSchema } from "@/lib/proof/schema";
import { createSaasLead } from "@/lib/sales-funnel-store";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const block = await checkAiRateLimit(ip, "proof-funnel", 5);
  if (block) return NextResponse.json(block, { status: 429 });

  const validated = await validateBody(request, proofSubmitSchema);
  if (!validated.ok) return validated.response;

  const body = validated.data;
  const report = computeProofReport(body);

  const service = createServiceRoleClient();
  const notePayload = JSON.stringify({
    proof: {
      answers: {
        leadsPerMonth: body.leadsPerMonth,
        responseMinutes: body.responseMinutes,
        dealRatePercent: body.dealRatePercent,
        followUpRatePercent: body.followUpRatePercent,
      },
      report: {
        revenueHealthScore: report.revenueHealthScore,
        monthlyLeakEur: report.leak.monthlyLeakEur,
        recoveredEur: report.leak.recoveredEur,
        leadsWithoutFollowUpEstimate: report.leadsWithoutFollowUpEstimate,
      },
    },
  });

  try {
    const lead = await createSaasLead(
      {
        name: body.name,
        email: body.email,
        phone: body.phone ?? "",
        company: body.company,
        agentsCount: body.agentsCount,
        city: body.city ?? "",
        note: notePayload,
        source: "proof",
      },
      service,
    );

    console.log(
      JSON.stringify({
        event: "proof_funnel_submit",
        leadId: lead.id,
        revenueHealthScore: report.revenueHealthScore,
        company: body.company,
      }),
    );

    return okResponse({ report, leadId: lead.id });
  } catch (err) {
    console.error("[api/proof]", err);
    return errorResponse("Nepodarilo sa uložiť výsledok. Skúste znova.", 500);
  }
}
