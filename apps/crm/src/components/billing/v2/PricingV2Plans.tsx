"use client";

import { useState } from "react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import { resolvePricingV2Band, type PricingV2Interval } from "@/lib/pricing-v2";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";
import { buildPlanRequest, PRICING_V2_MESSAGES, submitPricingV2Checkout } from "./checkout";
import { formatEurCents, formatUserRange } from "./format";

/** Funkcie plánov (rovnaký zoznam ako na marketingovom webe). Kľúč = id pásma. */
export const PLAN_FEATURES: Record<string, string[]> = {
  start: [
    "Denný briefing priorít",
    "Skóre pripravenosti kúpy (BRI)",
    "AI návrhy odpovedí na schválenie",
    "Dopyty z portálov na jednom mieste",
  ],
  team: ["Všetko zo Start", "Tímový prehľad pre majiteľa", "Ranný report pre celý tím"],
  office: ["Všetko z Team", "Prioritná podpora"],
  network: ["Všetko z Kancelárie"],
};

type Props = {
  config: PricingV2ConfigPayload;
  initialUsers?: number;
  /** Presmerovanie na Stripe; v testoch sa nahrádza. */
  navigate?: (url: string) => void;
};

const defaultNavigate = (url: string) => {
  window.location.href = url;
};

/**
 * Cenník v2: jedna mesačná cena za celú kanceláriu podľa počtu používateľov.
 * Všetky sumy (čistá aj konečná) idú z katalógu v `config.catalog`; view nič nepočíta.
 */
export default function PricingV2Plans({ config, initialUsers = 1, navigate = defaultNavigate }: Props) {
  const [users, setUsers] = useState<number>(initialUsers);
  const [packCredits, setPackCredits] = useState<number | null>(null);
  const [interval, setInterval] = useState<PricingV2Interval>("month");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = config.catalog;
  if (!catalog) return null;

  const resolved = resolvePricingV2Band(users);
  const selectedBand = resolved.ok ? catalog.bands.find((b) => b.id === resolved.band.id) ?? null : null;
  const selectedPack = packCredits === null ? null : catalog.packs.find((p) => p.credits === packCredits) ?? null;
  // Ročné platenie sa ponúka až keď existujú všetky ročné ceny (inak ostáva mesačné).
  const yearlyOffered = config.yearlyAvailable === true;
  const yearly = yearlyOffered && interval === "year";
  const per = yearly ? "rok" : "mes.";
  const amountOf = (band: (typeof catalog.bands)[number]) => (yearly ? band.annual : band);
  const canBuy = config.checkoutAvailable && selectedBand !== null && !busy;
  const vat = catalog.vatPercent;

  async function buy() {
    if (!canBuy) return;
    setBusy(true);
    setError(null);
    const outcome = await submitPricingV2Checkout(buildPlanRequest(users, yearly ? null : packCredits, yearly ? "year" : "month"));
    if (outcome.kind === "redirect") {
      navigate(outcome.url);
      return;
    }
    setError(outcome.message);
    setBusy(false);
  }

  return (
    <section
      data-testid="pricing-v2-plans"
      className="mb-8 rounded-xl border p-6"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <h2 className="text-xl font-semibold mb-1" style={{ color: SLATE_HORIZON.ink }}>
        Jedna cena za celú kanceláriu
      </h2>
      <p className="text-sm mb-1" style={{ color: SLATE_HORIZON.muted }}>
        Zadajte, koľko ľudí v kancelárii pracuje, a pásmo sa nastaví samo. Kredity na AI akcie patria celej kancelárii.
      </p>
      <p data-testid="vat-note" className="text-sm font-medium mb-4" style={{ color: SLATE_HORIZON.ink }}>
        Ceny sú {yearly ? "ročné" : "mesačné"} a uvedené bez DPH. Konečná suma s {vat} % DPH je uvedená pri každej cene.
      </p>
      {yearlyOffered && (
        <div role="radiogroup" aria-label="Fakturačné obdobie" className="mb-4 inline-flex rounded-lg border p-1" style={{ borderColor: SLATE_HORIZON.line }}>
          {(["month", "year"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={interval === value}
              data-testid={`interval-${value}`}
              onClick={() => setInterval(value)}
              className="rounded-md px-4 py-1.5 text-sm font-medium"
              style={{
                background: interval === value ? SLATE_HORIZON.brand : "transparent",
                color: interval === value ? "#fff" : SLATE_HORIZON.ink,
              }}
            >
              {value === "month" ? "Mesačne" : "Ročne"}
            </button>
          ))}
        </div>
      )}
      {yearly && (
        <p data-testid="yearly-note" className="mb-4 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Ročná cena je 12 × mesačná, bez zľavy. Platíte raz ročne, kredity sa prideľujú mesačne.
        </p>
      )}

      {!config.checkoutAvailable && (
        <p role="status" className="mb-4 rounded-lg border p-3 text-sm" style={{ background: "#FEF3C7", borderColor: "#FCD34D", color: "#92400E" }}>
          {PRICING_V2_MESSAGES.unavailable}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {catalog.bands.map((band) => {
          const active = selectedBand?.id === band.id;
          return (
            <div
              key={band.id}
              data-testid={`band-${band.id}`}
              data-selected={active ? "true" : "false"}
              className="rounded-lg border p-4"
              style={{
                borderColor: active ? SLATE_HORIZON.brand : SLATE_HORIZON.line,
                background: active ? SLATE_HORIZON.soft : "#fff",
              }}
            >
              <div className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                {band.label}
              </div>
              <div className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                {formatUserRange(band.minUsers, band.maxUsers)}
              </div>
              <div className="mt-2 text-2xl font-bold" style={{ color: SLATE_HORIZON.brandDeep }}>
                <span data-testid={`band-${band.id}-net`}>
                  {band.isFromPrice ? "od " : ""}
                  {formatEurCents(amountOf(band).netCents)}
                </span>
                <span className="text-sm font-normal" style={{ color: SLATE_HORIZON.muted }}>
                  {" "}
                  bez DPH / {per}
                </span>
              </div>
              <div className="text-sm" style={{ color: SLATE_HORIZON.ink }}>
                <span data-testid={`band-${band.id}-gross`}>
                  {band.isFromPrice ? "od " : ""}
                  {formatEurCents(amountOf(band).grossCents)}
                </span>{" "}
                s {vat} % DPH / {per}
              </div>
              <p className="text-xs mt-2" style={{ color: SLATE_HORIZON.muted }}>
                {band.monthlyCredits} kreditov mesačne pre kanceláriu
              </p>
              {band.isFromPrice && (
                <p className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
                  Cenu siete dojednáme podľa objemu.
                </p>
              )}
              {(PLAN_FEATURES[band.id] ?? []).length > 0 && (
                <ul data-testid={`band-${band.id}-features`} className="mt-3 space-y-1 text-sm" style={{ color: SLATE_HORIZON.ink }}>
                  {(PLAN_FEATURES[band.id] ?? []).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" style={{ color: SLATE_HORIZON.brand }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-6 mb-6">
        <label className="block">
          <span className="text-sm font-medium" style={{ color: SLATE_HORIZON.ink }}>
            Počet používateľov
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={Number.isFinite(users) ? users : ""}
            onChange={(e) => setUsers(e.target.value === "" ? Number.NaN : Number(e.target.value))}
            className="mt-1 block w-28 rounded-md border px-3 py-2"
            style={{ borderColor: SLATE_HORIZON.line }}
            aria-label="Počet používateľov"
          />
        </label>

        {!config.plansOnly && !yearly && (
          <label className="block">
            <span className="text-sm font-medium" style={{ color: SLATE_HORIZON.ink }}>
              Mesačný balík kreditov navyše
            </span>
            <select
              value={packCredits === null ? "" : String(packCredits)}
              onChange={(e) => setPackCredits(e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 block rounded-md border px-3 py-2"
              style={{ borderColor: SLATE_HORIZON.line }}
              aria-label="Mesačný balík kreditov"
            >
              <option value="">Bez balíka</option>
              {catalog.packs.map((p) => (
                <option key={p.credits} value={String(p.credits)}>
                  {p.credits} kreditov · {formatEurCents(p.netCents)} bez DPH ({formatEurCents(p.grossCents)} s DPH) / mes.
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div data-testid="selection-summary" className="mb-4 text-sm" style={{ color: SLATE_HORIZON.ink }}>
        {selectedBand ? (
          <>
            <p>
              Pásmo <strong data-testid="selected-band-label">{selectedBand.label}</strong>:{" "}
              <strong data-testid="selected-net">{formatEurCents(amountOf(selectedBand).netCents)}</strong> bez DPH ·{" "}
              <strong data-testid="selected-gross">{formatEurCents(amountOf(selectedBand).grossCents)}</strong> s DPH {yearly ? "ročne" : "mesačne"}
            </p>
            {selectedPack && (
              <p data-testid="selected-pack">
                Balík {selectedPack.credits} kreditov: {formatEurCents(selectedPack.netCents)} bez DPH ·{" "}
                {formatEurCents(selectedPack.grossCents)} s DPH mesačne
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
              {yearly
                ? "Konečný súčet s DPH uvedie Stripe pri objednávke."
                : "Plán a balík sú dve mesačné položky; konečný súčet s DPH uvedie Stripe pri objednávke."}
            </p>
          </>
        ) : (
          <p>Zadajte celý počet používateľov od 1.</p>
        )}
      </div>

      <button
        type="button"
        disabled={!canBuy}
        onClick={buy}
        className="rounded-md px-6 py-2.5 font-semibold text-white"
        style={{ background: SLATE_HORIZON.topbarGradient, opacity: canBuy ? 1 : 0.6 }}
      >
        {busy ? "Presmerovanie…" : "Pokračovať k objednávke"}
      </button>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: SLATE_HORIZON.red, color: SLATE_HORIZON.danger }}>
          {error}
        </p>
      )}
    </section>
  );
}
