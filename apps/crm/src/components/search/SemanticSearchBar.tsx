"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_INPUT } from "@/lib/slate-horizon-theme";

// ─── Typy ────────────────────────────────────────────────────

type EntityType = "leads" | "properties";

type LeadResult = {
  id: string;
  name: string;
  location: string;
  status: string;
  score: number;
  budget: string;
  similarity: number;
};

type PropertyResult = {
  id: string;
  title: string;
  location: string;
  type: string;
  rooms: string;
  price: number;
  status: string;
  similarity: number;
};

type SearchResult = LeadResult | PropertyResult;

type SearchResponse = {
  results: SearchResult[];
  mode: "semantic" | "fallback";
  query: string;
};

function isLeadResult(r: SearchResult): r is LeadResult {
  return "name" in r;
}

// ─── Pomocníci ────────────────────────────────────────────────

function SimilarityBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? SLATE_HORIZON.brandDeep :
    pct >= 50 ? SLATE_HORIZON.warning :
    SLATE_HORIZON.muted;
  return (
    <span
      className="ml-auto flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: SLATE_HORIZON.soft, color, border: `1px solid ${SLATE_HORIZON.softBorder}` }}
    >
      {pct}%
    </span>
  );
}

function LeadRow({ result }: { result: LeadResult }) {
  return (
    <Link
      href={`/leads/${result.id}`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
      style={{ background: "transparent" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = SLATE_HORIZON.soft; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span className="text-base flex-shrink-0">👤</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-slate-900" style={{ color: SLATE_HORIZON.ink }}>{result.name}</p>
        <p className="text-[11px] truncate" style={{ color: SLATE_HORIZON.muted }}>
          {result.location} · {result.budget} · {result.status}
        </p>
      </div>
      <SimilarityBadge value={result.similarity} />
    </Link>
  );
}

function PropertyRow({ result }: { result: PropertyResult }) {
  const price = result.price > 0
    ? `${result.price.toLocaleString("sk-SK")} €`
    : "Cena neuvedená";
  return (
    <Link
      href={`/properties/${result.id}`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
      style={{ background: "transparent" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = SLATE_HORIZON.soft; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span className="text-base flex-shrink-0">🏠</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-slate-900" style={{ color: SLATE_HORIZON.ink }}>{result.title}</p>
        <p className="text-[11px] truncate" style={{ color: SLATE_HORIZON.muted }}>
          {result.location} · {result.rooms} · {price}
        </p>
      </div>
      <SimilarityBadge value={result.similarity} />
    </Link>
  );
}

// ─── Hlavný komponent ─────────────────────────────────────────

interface SemanticSearchBarProps {
  /** Typ entít na vyhľadávanie */
  type: EntityType;
  /** Placeholder text */
  placeholder?: string;
  /** Maximálny počet výsledkov */
  limit?: number;
  /** CSS triedy pre wrapper */
  className?: string;
}

export default function SemanticSearchBar({
  type,
  placeholder,
  limit = 8,
  className = "",
}: SemanticSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mode, setMode] = useState<"semantic" | "fallback" | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const defaultPlaceholder =
    type === "leads"
      ? 'Hľadaj príležitosti… napr. "Poprad 3-izbový byt do 150k"'
      : 'Hľadaj nehnuteľnosti… napr. "Bratislava novostavba 2+1"';

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/search/semantic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q.trim(), type, limit }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: SearchResponse = await res.json();
        setResults(data.results ?? []);
        setMode(data.mode);
        setOpen(true);
      } catch (err) {
        setError("Vyhľadávanie zlyhalo. Skúste znova.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [type, limit]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(val), 350);
  }

  function handleBlur() {
    // Oneskorenie, aby klik na výsledok stihol prebehnúť pred zatvorením
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base"
          aria-hidden
        >
          {loading ? "⏳" : "🔍"}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder ?? defaultPlaceholder}
          className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-all text-slate-900"
          style={{
            background: WORKDESK_INPUT.background,
            border: `1px solid ${WORKDESK_INPUT.borderColor}`,
            color: WORKDESK_INPUT.color,
          }}
          onFocus={(e) => {
            (e.target as HTMLInputElement).style.borderColor = SLATE_HORIZON.brand;
            if (results.length > 0) setOpen(true);
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = WORKDESK_INPUT.borderColor;
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (query.trim().length >= 2) && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border shadow-2xl"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          {/* Hlavička */}
          <div
            className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ borderBottom: `1px solid ${WORKDESK_CARD.borderColor}`, color: SLATE_HORIZON.brandDeep }}
          >
            <span>
              {mode === "semantic" ? "⚡ AI Semantic Search" : "🔤 Textové vyhľadávanie"}
            </span>
            <span style={{ color: SLATE_HORIZON.muted }}>{results.length} výsledkov</span>
          </div>

          {/* Výsledky */}
          <div className="max-h-72 overflow-y-auto p-1.5">
            {error && (
              <p className="px-3 py-2 text-xs" style={{ color: SLATE_HORIZON.danger }}>{error}</p>
            )}

            {!error && results.length === 0 && (
              <p className="px-3 py-3 text-center text-xs" style={{ color: SLATE_HORIZON.muted }}>
                Žiadne výsledky pre „{query}"
              </p>
            )}

            {results.map((result) =>
              isLeadResult(result) ? (
                <LeadRow key={result.id} result={result} />
              ) : (
                <PropertyRow key={result.id} result={result as PropertyResult} />
              )
            )}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div
              className="px-3 py-2 text-[10px]"
              style={{ borderTop: `1px solid ${WORKDESK_CARD.borderColor}`, color: SLATE_HORIZON.muted }}
            >
              ↵ klikni pre otvorenie · ESC pre zavretie
            </div>
          )}
        </div>
      )}
    </div>
  );
}
