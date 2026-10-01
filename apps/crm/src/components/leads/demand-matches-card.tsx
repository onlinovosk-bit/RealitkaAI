"use client";
import { useEffect, useState } from "react";
import {
  SLATE_HORIZON,
  WORKDESK_CARD,
  WORKDESK_INNER_ROW,
} from "@/lib/slate-horizon-theme";

/**
 * DEMAND-D4: matches computed from the lead's verified demand. Every field is
 * shown as ✓ / ✗ / ⚠ neznáme next to the lead's own words, so the broker sees
 * why a listing is proposed. Renders nothing until a demand record exists —
 * no empty card on every lead before D1 is switched on.
 */

type FieldOutcome = {
  status: "match" | "mismatch" | "unknown";
  lead_evidence?: string | null;
  property_value?: unknown;
};

type MatchRow = {
  property_id: string;
  score: number;
  fields: Record<string, FieldOutcome>;
  properties?: { title?: string | null; location?: string | null; price?: number | null } | null;
};

type ApiResponse = {
  ok: boolean;
  demand: unknown | null;
  matches: MatchRow[];
  reason?: string;
};

const LABELS: Record<string, string> = {
  property_type: "Typ",
  transaction: "Transakcia",
  location: "Lokalita",
  budget_max: "Rozpočet",
  rooms_min: "Izby",
  area_min: "Plocha",
};

const MARK: Record<FieldOutcome["status"], { sign: string; color: string; text: string }> = {
  match: { sign: "✓", color: "#15803d", text: "sedí" },
  mismatch: { sign: "✗", color: "#b91c1c", text: "nesedí" },
  unknown: { sign: "⚠", color: "#a16207", text: "neznáme" },
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v >= 1000 ? `${v.toLocaleString("sk-SK")}` : String(v);
  return String(v);
}

export default function DemandMatchesCard({ leadId }: { leadId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads/${leadId}/demand-matches`)
      .then((r) => r.json())
      .then((d: ApiResponse) => { if (d.ok) setData(d); })
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return <div className="animate-pulse h-16 rounded-xl" style={{ background: WORKDESK_INNER_ROW.background }} />;
  }
  if (!data || data.reason === "no_demand") return null;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <h3 className="text-sm font-semibold mb-1" style={{ color: SLATE_HORIZON.ink }}>
        Zhody podľa overeného dopytu
      </h3>

      {data.reason ? (
        <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
          {data.reason === "insufficient_demand"
            ? "Dopyt je neúplný: na zhodu treba typ nehnuteľnosti a lokalitu alebo rozpočet, ktoré klient sám uviedol."
            : "Dopyt sa z tejto správy nepodarilo spoľahlivo určiť."}
        </p>
      ) : data.matches.length === 0 ? (
        <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Medzi aktívnymi nehnuteľnosťami kancelárie zatiaľ nič nezodpovedá dopytu.
        </p>
      ) : (
        <ul className="space-y-3 mt-2">
          {data.matches.map((m) => (
            <li key={m.property_id} className="rounded-xl p-3" style={{ background: WORKDESK_INNER_ROW.background }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                  {m.properties?.title || m.property_id}
                </span>
                <span className="text-xs font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
                  {Math.round(m.score * 100)} %
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {Object.entries(m.fields).map(([key, f]) => (
                  <li key={key} className="text-xs" style={{ color: SLATE_HORIZON.navText }}>
                    <span style={{ color: MARK[f.status].color }}>{MARK[f.status].sign}</span>{" "}
                    {LABELS[key] ?? key}: {formatValue(f.property_value)}
                    {f.status === "unknown" ? (
                      <span style={{ color: SLATE_HORIZON.muted }}> ({MARK.unknown.text})</span>
                    ) : null}
                    {f.lead_evidence ? (
                      <span style={{ color: SLATE_HORIZON.muted }}> · klient: „{f.lead_evidence}“</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
