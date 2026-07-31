"use client";

import { useState } from "react";
import type { ListingOutput } from "@/lib/ai/schemas/listing-output";
import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_INPUT } from "@/lib/slate-horizon-theme";

type Props = {
  generationId: string | null;
  output: ListingOutput;
  onPatch: (action: string, extra?: Record<string, unknown>) => Promise<void>;
};

function Card({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-4 md:p-5"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ color: SLATE_HORIZON.ink }}>
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

export default function ListingOutputCards({ generationId, output, onPatch }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function copy(text: string, variant: string) {
    await navigator.clipboard.writeText(text);
    if (generationId) await onPatch("copy", { variant });
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!generationId) return;
    setBusy(true);
    try {
      await onPatch(action, extra);
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:opacity-80 disabled:opacity-50";

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card
        title="Portál"
        actions={
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() => copy(`${output.headline_variants[0]}\n\n${output.portal_description}\n\n${output.cta}`, "portal")}
          >
            Kopírovať
          </button>
        }
      >
        <ul className="mb-3 space-y-1 text-sm font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
          {output.headline_variants.map((h, i) => (
            <li key={i}>• {h}</li>
          ))}
        </ul>
        {editing === "portal" ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={8}
            className="mb-2 w-full rounded-xl border px-3 py-2 text-sm"
            style={WORKDESK_INPUT}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm" style={{ color: SLATE_HORIZON.ink }}>
            {output.portal_description}
          </p>
        )}
        <p className="mt-2 text-xs font-medium" style={{ color: SLATE_HORIZON.muted }}>
          CTA: {output.cta}
        </p>
      </Card>

      <Card
        title="Sociálne siete"
        actions={
          <button type="button" className={btn} disabled={busy} onClick={() => copy(output.social_description, "social")}>
            Kopírovať
          </button>
        }
      >
        <p className="whitespace-pre-wrap text-sm" style={{ color: SLATE_HORIZON.ink }}>
          {output.social_description}
        </p>
      </Card>

      <Card title="Chýbajúce info">
        <ul className="list-disc space-y-1 pl-4 text-sm" style={{ color: SLATE_HORIZON.ink }}>
          {output.missing_information.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        {output.objection_handling.length > 0 && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: SLATE_HORIZON.line }}>
            <p className="mb-2 text-xs font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
              Námietky
            </p>
            {output.objection_handling.map((o, i) => (
              <div key={i} className="mb-2 text-xs" style={{ color: SLATE_HORIZON.ink }}>
                <strong>{o.weakness}:</strong> {o.reframing}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="SEO">
        <div className="mb-3 flex flex-wrap gap-2">
          {output.seo_keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}
            >
              {kw}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          {(["overall", "completeness", "credibility", "marketing", "seo"] as const).map((k) => (
            <div key={k} className="rounded-lg p-2 text-center" style={{ background: SLATE_HORIZON.bg }}>
              <div className="font-bold" style={{ color: SLATE_HORIZON.ink }}>
                {output.quality_score[k]}
              </div>
              <div style={{ color: SLATE_HORIZON.muted }}>{k}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <button
          type="button"
          className={btn}
          disabled={busy || !generationId}
          onClick={() => {
            setEditing("portal");
            setEditText(output.portal_description);
          }}
        >
          Upraviť
        </button>
        {editing === "portal" && (
          <>
            <button
              type="button"
              className={btn}
              disabled={busy}
              onClick={() => run("edit", { editedText: editText })}
            >
              Uložiť úpravu
            </button>
            <button type="button" className={btn} disabled={busy} onClick={() => run("save", { editedText: editText })}>
              Uložiť draft
            </button>
          </>
        )}
        <button
          type="button"
          className={btn}
          disabled={busy || !generationId}
          onClick={() => run("publish", { variant: "portal", publishedTo: ["manual"] })}
        >
          Označiť použitý
        </button>
        <span className="flex items-center gap-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Ohodnoť:
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy || !generationId}
              className={`${btn} ${rating === n ? "font-bold" : ""}`}
              onClick={async () => {
                setRating(n);
                await run("rate", { rating: n });
              }}
            >
              {n}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
