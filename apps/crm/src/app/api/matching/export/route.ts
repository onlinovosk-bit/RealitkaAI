import { NextResponse } from "next/server";
import { listPersistedMatches } from "@/lib/matching-store";
import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";

function escapeCsv(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status")?.trim() || undefined;

    const [matches, leads, properties] = await Promise.all([
      listPersistedMatches(),
      listLeads(),
      listProperties(),
    ]);

    const rows = matches
      .map((match) => {
        const lead = leads.find((item) => item.id === match.leadId);
        const property = properties.find((item) => item.id === match.propertyId);
        return {
          leadName: lead?.name ?? match.leadId,
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
