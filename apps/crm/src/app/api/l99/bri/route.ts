import { NextResponse } from "next/server";
import { computeEnterpriseBri } from "@/lib/l99/bri-engine";
import { checkEnterpriseAccess } from "@/lib/l99/entitlements";
import type { BriComponents } from "@/lib/l99/types";

export async function POST(request: Request) {
  const access = await checkEnterpriseAccess();

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          access.reason === "locked_downgrade"
            ? "BRI je zamknuté po downgrade. Obnovte Enterprise plán."
            : "Vyžaduje Enterprise plán.",
        currentTier: access.currentTier,
        upgradeUrl: "/billing",
      },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    leadId: string;
    components: BriComponents;
    leadContext: { name: string; lastActivity: string };
  };

  const result = await computeEnterpriseBri(body.leadId, body.components, body.leadContext);
  return NextResponse.json(result);
}
