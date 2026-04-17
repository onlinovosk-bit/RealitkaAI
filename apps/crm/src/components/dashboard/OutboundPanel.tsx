"use client";

import { useCallback, useEffect, useState } from "react";

import { generateProspectEmail, type ProspectEmailInput } from "@/lib/ai/prospect-email-generator";

type Prospect = {
  id: string;
  name: string;
  city: string | null;
  listingsCount: number;
  score: number;
  source: string;
  scrapedAt: string;
};

export default function OutboundPanel() {
  const [leads, setLeads] = useState<Prospect[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach/prospects", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Nepodarilo sa načítať prospekty.");
        return;
      }
      setLeads(data.prospects || []);
      setHint(typeof data.hint === "string" ? data.hint : null);
    } catch {
      setError("Sieťová chyba.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runScrape = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Scrape zlyhal.");
        return;
      }
      await load();
    } catch {
      setError("Sieťová chyba pri scrape.");
    } finally {
      setRunning(false);
    }
  };

  const openDraft = (id: string, lead: Prospect) => {
    const payload: ProspectEmailInput = {
      name: lead.name,
      city: lead.city,
      listingsCount: lead.listingsCount,
    };
    const text = generateProspectEmail(payload);
    setDrafts((d) => ({ ...d, [id]: text }));
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Odporúčané realitky na oslovenie</h2>
          <p className="mt-1 text-sm text-gray-600">
            Scraper → skóre → DB → návrh e-mailu. Live scraper zapnite len po právnej kontrole (
            <code className="rounded bg-white px-1">SCRAPER_LIVE_ENABLED=true</code>).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runScrape()}
          disabled={running}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
        >
          {running ? "Spúšťam scrape…" : "Spustiť scrape"}
        </button>
      </div>

      {hint ? (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-2 text-sm text-amber-950">{hint}</p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Načítavam…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-gray-600">
          Zatiaľ žiadne prospekty. Spustite scrape (vyžaduje service role pre zápis) alebo skontrolujte migráciu{" "}
          <code className="rounded bg-white px-1">scraped_agencies</code>.
        </p>
      ) : (
        <ul className="space-y-4">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="font-semibold text-gray-900">{lead.name}</p>
              <p className="text-sm text-gray-600">{lead.city || "—"}</p>
              <p className="text-sm text-gray-600">
                Ponúk: {lead.listingsCount} · skóre: {lead.score} · {lead.source}
              </p>
              <button
                type="button"
                onClick={() => openDraft(lead.id, lead)}
                className="mt-3 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Vygenerovať text e-mailu
              </button>
              {drafts[lead.id] ? (
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
                  {drafts[lead.id]}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
