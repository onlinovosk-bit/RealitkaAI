"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ListingInput } from "@/lib/ai/schemas/listing-input";
import type { ListingOutput } from "@/lib/ai/schemas/listing-output";
import { SLATE_HORIZON, WORKDESK_INPUT } from "@/lib/slate-horizon-theme";
import ListingOutputCards from "./ListingOutputCards";

const initialForm: ListingInput = {
  property_type: "byt",
  disposition: "",
  city: "",
  district: "",
  size_m2: 0,
  price_eur: 0,
  purpose: "predaj",
  highlights: "",
  weaknesses: "",
};

export default function ListingGeneratorForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<ListingOutput | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [creditsSpent, setCreditsSpent] = useState<number | null>(null);

  function update<K extends keyof ListingInput>(key: K, value: ListingInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function patchGeneration(action: string, extra?: Record<string, unknown>) {
    if (!generationId) return;
    await fetch(`/api/ai/generate-listing/${generationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setOutput(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await fetch("/api/ai/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: form, idempotencyKey }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        output?: ListingOutput;
        generationId?: string;
        creditsSpent?: number;
      };

      if (!res.ok || !data.ok) {
        if (res.status === 402) {
          throw new Error(
            `${data.error ?? "Nedostatok kreditov."} ` +
              "Doplňte kredity v nastaveniach fakturácie.",
          );
        }
        throw new Error(data.error ?? "Generovanie zlyhalo.");
      }

      setOutput(data.output ?? null);
      setGenerationId(data.generationId ?? null);
      setCreditsSpent(data.creditsSpent ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generovanie zlyhalo.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none";
  const inputStyle = {
    background: WORKDESK_INPUT.background,
    borderColor: WORKDESK_INPUT.borderColor,
    color: WORKDESK_INPUT.color,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Typ *</span>
            <select
              value={form.property_type}
              onChange={(e) => update("property_type", e.target.value as ListingInput["property_type"])}
              className={inputClass}
              style={inputStyle}
              required
            >
              <option value="byt">Byt</option>
              <option value="dom">Dom</option>
              <option value="pozemok">Pozemok</option>
              <option value="komerčný priestor">Komerčný priestor</option>
              <option value="chata">Chata</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Dispozícia *</span>
            <input
              value={form.disposition}
              onChange={(e) => update("disposition", e.target.value)}
              placeholder="2-izbový"
              className={inputClass}
              style={inputStyle}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Mesto/obec *</span>
            <input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className={inputClass}
              style={inputStyle}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Časť/ulica</span>
            <input
              value={form.district ?? ""}
              onChange={(e) => update("district", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Výmera m² *</span>
            <input
              type="number"
              min={1}
              value={form.size_m2 || ""}
              onChange={(e) => update("size_m2", Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Cena € *</span>
            <input
              type="number"
              min={1}
              value={form.price_eur || ""}
              onChange={(e) => update("price_eur", Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Účel *</span>
            <select
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value as ListingInput["purpose"])}
              className={inputClass}
              style={inputStyle}
            >
              <option value="predaj">Predaj</option>
              <option value="prenájom">Prenájom</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>Stav</span>
            <select
              value={form.condition ?? ""}
              onChange={(e) => update("condition", (e.target.value || undefined) as ListingInput["condition"])}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">—</option>
              <option value="novostavba">Novostavba</option>
              <option value="po rekonštrukcii">Po rekonštrukcii</option>
              <option value="čiastočná rekonštrukcia">Čiastočná rekonštrukcia</option>
              <option value="pôvodný stav">Pôvodný stav</option>
              <option value="na rekonštrukciu">Na rekonštrukciu</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>
            Čo je na nehnuteľnosti najlepšie (max 300 znakov)
          </span>
          <textarea
            maxLength={300}
            rows={2}
            value={form.highlights ?? ""}
            onChange={(e) => update("highlights", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium" style={{ color: SLATE_HORIZON.ink }}>
            Slabiny — systém z nich urobí obrátenie námietky (max 300 znakov)
          </span>
          <textarea
            maxLength={300}
            rows={2}
            value={form.weaknesses ?? ""}
            onChange={(e) => update("weaknesses", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
          style={{ background: SLATE_HORIZON.brandDeep }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Generujem texty…" : "Generovať inzerát (2 kredity)"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {error.includes("kredit") && (
            <>
              {" "}
              <Link href="/billing" className="font-semibold underline">
                Doplniť kredity
              </Link>
            </>
          )}
        </p>
      )}

      {creditsSpent != null && output && (
        <p className="mt-3 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Odpočítané kredity: {creditsSpent}
        </p>
      )}

      {output && (
        <ListingOutputCards generationId={generationId} output={output} onPatch={patchGeneration} />
      )}
    </div>
  );
}
