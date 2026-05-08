import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPersistedMatches } from "@/lib/matching-store";
import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";
import { maskName, shouldRedactPiiForExport } from "@/lib/pii-mask";

function escapeCsv(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status")?.trim() || undefined;
    const redactPii = shouldRedactPiiForExport(request);

    const [matches, leads, properties] = await Promise.all([
      listPersistedMatches(),
      listLeads(),
      listProperties(),
    ]);

    const rows = matches
      .map((match) => {
        const lead = leads.find((item) => item.id === match.leadId);
        const property = properties.find((item) => item.id === match.propertyId);
        const rawName = lead?.name ?? match.leadId;
        return {
          leadName: redactPii ? maskName(String(rawName)) : rawName,
          propertyTitle: property?.title ?? match.propertyId,
          propertyLocation: property?.location ?? "-",
          propertyPrice: property?.price ?? 0,
          matchScore: match.matchScore,
          reasons: match.reasons.join("; "),
          modelVersion: match.modelVersion,
          createdAt: match.createdAt ?? "",
        };
      })
      .filter((item) => !statusFilter || item.matchScore.toString() === statusFilter);

    const headers = ["Lead", "Nehnuteľnosť", "Lokalita", "Cena", "Zhoda", "Dôvody", "Model", "Vytvorené"];

    const csvRows = rows.map((item) =>
      [
        item.leadName,
        item.propertyTitle,
        item.propertyLocation,
        item.propertyPrice,
        item.matchScore,
        item.reasons,
        item.modelVersion,
        item.createdAt,
      ]
        .map((v) => escapeCsv(v))
        .join(",")
    );

    const csv = [headers.join(","), ...csvRows].join("\n");
    const filename = `matching_export_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nepodarilo sa exportovať matching CSV.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
