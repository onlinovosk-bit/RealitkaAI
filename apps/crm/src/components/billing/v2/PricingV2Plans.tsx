"use client";

import { useState } from "react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import {
  annualPromoNetCents,
  illustrativeAnnualMonthlyNetCents,
  isAnnualPromoActive,
  licenseNetCents,
  priceFromNetCents,
  resolvePricingV2BandResult,
  type PricingV2Interval,
} from "@/lib/pricing-v2";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";
import { ANNUAL_PROMO_HEADLINE, GUARANTEE_TEXT } from "@/components/marketing/guarantee-copy";
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

/** Stepper počtu maklérov: 1 až `MAX_BROKERS` (nad 50 sa cena počíta rovnakým vzorcom). */
export const MIN_BROKERS = 1;
export const MAX_BROKERS = 200;

type Props = {
  config: PricingV2ConfigPayload;
  initialUsers?: number;
  /** Presmerovanie na Stripe; v testoch sa nahrádza. */
  navigate?: (url: string) => void;
  /** Okamih pre posúdenie akcie 9/12 (len testy); predvolene teraz. */
  now?: Date;
};

const defaultNavigate = (url: string) => {
  window.location.href = url;
};

/**
 * Cenník v3: licencia podľa počtu maklérov. Pásmo sa nevyberá ručne, odvodí sa z počtu (`resolvePricingV2Band`).
 * Cena sa pri zmene počtu a obdobia prepočíta živo cez `licenseNetCents`; karty pásiem a balíky idú z `config.catalog`.
 */
export default function PricingV2Plans({ config, initialUsers = 1, navigate = defaultNavigate, now }: Props) {
  const [users, setUsers] = useState<number>(initialUsers);
  const [packCredits, setPackCredits] = useState<number | null>(null);
  const [interval, setInterval] = useState<PricingV2Interval>("year");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = config.catalog;
  if (!catalog) return null;

  const resolved = resolvePricingV2BandResult(users);
  const validUsers = resolved.ok && users >= MIN_BROKERS && users <= MAX_BROKERS;
  const selectedBand = resolved.ok && validUsers ? catalog.bands.find((b) => b.id === resolved.band.id) ?? null : null;
  const selectedPack = packCredits === null ? null : catalog.packs.find((p) => p.credits === packCredits) ?? null;
  // Ročné platenie sa ponúka až keď existuje ročná cena (inak ostáva mesačné).
  const yearlyOffered = config.yearlyAvailable === true;
  const yearly = yearlyOffered && interval === "year";
  const promoActive = yearly && isAnnualPromoActive(now ?? new Date());
  const vat = catalog.vatPercent;

  // Živý prepočet: suma, ktorú zaplatí zákazník za obdobie (pri akcii prvá ročná faktúra = 9 × základ).
  const regularNet = validUsers ? licenseNetCents(users, yearly ? "year" : "month") : null;
  const chargedNet = validUsers ? (promoActive ? annualPromoNetCents(users) : regularNet) : null;
  const charged = chargedNet === null ? null : priceFromNetCents(chargedNet, vat);
  const regular = regularNet === null ? null : priceFromNetCents(regularNet, vat);
  const yearNet = validUsers ? licenseNetCents(users, "year") : null;
  const annualMonthlyIsExact = yearNet !== null && yearNet % 12 === 0;
  // Od 21. makléra ročná suma nie je deliteľná 12. `illustrativeAnnualMonthlyNetCents` je len text, nie položka faktúry.
  const baseMonthly = yearNet === null ? null : priceFromNetCents(illustrativeAnnualMonthlyNetCents(users), vat);

  const per = yearly ? "rok" : "mes.";
  const cardAmount = (band: (typeof catalog.bands)[number]) => (yearly ? band : band.monthly);
  const canBuy = config.checkoutAvailable && selectedBand !== null && !busy;

  function step(delta: number) {
    const current = Number.isFinite(users) ? users : MIN_BROKERS;
    setUsers(Math.min(MAX_BROKERS, Math.max(MIN_BROKERS, Math.trunc(current) + delta)));
  }

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
        Cena podľa počtu maklérov
      </h2>
      <p className="text-sm mb-1" style={{ color: SLATE_HORIZON.muted }}>
        Zadajte, koľko maklérov bude Revolis.AI používať, a pásmo sa nastaví samo. Kredity na AI akcie patria celej kancelárii.
      </p>
      <p data-testid="vat-note" className="text-sm font-medium mb-4" style={{ color: SLATE_HORIZON.ink }}>
        Ceny sú {yearly ? "ročné" : "mesačné"} a uvedené bez DPH. Konečná suma s {vat} % DPH je uvedená pri každej cene.
      </p>

      <div className="flex flex-wrap items-end gap-6 mb-4">
        <div className="block">
          <span className="text-sm font-medium block" style={{ color: SLATE_HORIZON.ink }}>
            Počet maklérov
          </span>
          <div className="mt-1 inline-flex items-center gap-2">
            <button
              type="button"
              data-testid="seats-dec"
              aria-label="Znížiť počet maklérov"
              disabled={Number.isFinite(users) && users <= MIN_BROKERS}
              onClick={() => step(-1)}
              className="h-10 w-10 rounded-md border text-lg font-semibold"
              style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.ink }}
            >
              −
            </button>
            <input
              type="number"
              min={MIN_BROKERS}
              max={MAX_BROKERS}
              step={1}
              value={Number.isFinite(users) ? users : ""}
              onChange={(e) => setUsers(e.target.value === "" ? Number.NaN : Number(e.target.value))}
              className="block w-24 rounded-md border px-3 py-2 text-center"
              style={{ borderColor: SLATE_HORIZON.line }}
              aria-label="Počet maklérov"
            />
            <button
              type="button"
              data-testid="seats-inc"
              aria-label="Zvýšiť počet maklérov"
              disabled={Number.isFinite(users) && users >= MAX_BROKERS}
              onClick={() => step(1)}
              className="h-10 w-10 rounded-md border text-lg font-semibold"
              style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.ink }}
            >
              +
            </button>
          </div>
        </div>

        {yearlyOffered && (
          <div role="radiogroup" aria-label="Fakturačné obdobie" className="inline-flex rounded-lg border p-1" style={{ borderColor: SLATE_HORIZON.line }}>
            {(["year", "month"] as const).map((value) => (
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
                {value === "year" ? "Ročne" : "Mesačne (+20 %)"}
              </button>
            ))}
          </div>
        )}

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

      {promoActive && (
        <p data-testid="promo-note" className="mb-4 rounded-lg border px-4 py-3 text-sm font-semibold" style={{ background: SLATE_HORIZON.soft, borderColor: SLATE_HORIZON.softBorder, color: SLATE_HORIZON.brandDeep }}>
          {ANNUAL_PROMO_HEADLINE}
        </p>
      )}
      {!yearly && yearlyOffered && (
        <p data-testid="monthly-note" className="mb-4 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Mesačná platba bez ročného záväzku je o 20 % vyššia ako pri ročnej platbe.
        </p>
      )}
      {yearly && (
        <p data-testid="yearly-note" className="mb-4 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Platíte raz ročne, kredity sa prideľujú mesačne.
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
          const amount = cardAmount(band);
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
                  {formatEurCents(amount.netCents)}
                </span>
                <span className="text-sm font-normal" style={{ color: SLATE_HORIZON.muted }}>
                  {" "}
                  bez DPH / mes.
                </span>
              </div>
              <div className="text-sm" style={{ color: SLATE_HORIZON.ink }}>
                <span data-testid={`band-${band.id}-gross`}>
                  {band.isFromPrice ? "od " : ""}
                  {formatEurCents(amount.grossCents)}
                </span>{" "}
                s {vat} % DPH / mes.
              </div>
              <p className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
                {yearly ? "pri ročnej platbe" : "pri mesačnej platbe (+20 %)"}
              </p>
              <p className="text-xs mt-2" style={{ color: SLATE_HORIZON.muted }}>
                {band.monthlyCredits} kreditov mesačne pre kanceláriu
              </p>
              {band.isFromPrice && (
                <p className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
                  Cena rastie s počtom maklérov.
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

      <div data-testid="selection-summary" className="mb-4 text-sm" style={{ color: SLATE_HORIZON.ink }}>
        {selectedBand && charged && regular && baseMonthly ? (
          <>
            <p>
              Pásmo <strong data-testid="selected-band-label">{selectedBand.label}</strong> · {users}{" "}
              {users === 1 ? "maklér" : users < 5 ? "makléri" : "maklérov"}
            </p>
            <p>
              {promoActive ? "Prvá ročná faktúra: " : yearly ? "Ročne: " : "Mesačne: "}
              <strong data-testid="selected-net">{formatEurCents(charged.netCents)}</strong> bez DPH ·{" "}
              <strong data-testid="selected-gross">{formatEurCents(charged.grossCents)}</strong> s DPH / {per}
            </p>
            {promoActive && (
              <p data-testid="year2-note" className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
                Od 2. roka bežná cena {formatEurCents(regular.netCents)} bez DPH ({formatEurCents(regular.grossCents)} s DPH) / rok.
              </p>
            )}
            {yearly && (
              <p data-testid="selected-base-monthly" className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
                {annualMonthlyIsExact
                  ? `Bežná cena pri ročnej platbe: ${formatEurCents(baseMonthly.netCents)} bez DPH mesačne.`
                  : `Orientačne ${formatEurCents(baseMonthly.netCents)} bez DPH mesačne pri ročnej platbe. Fakturovaná je ročná suma.`}
              </p>
            )}
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
          <p>Zadajte celý počet maklérov od {MIN_BROKERS} do {MAX_BROKERS}.</p>
        )}
      </div>

      <p data-testid="guarantee" className="mb-4 text-sm font-medium" style={{ color: SLATE_HORIZON.greenDark }}>
        {GUARANTEE_TEXT}
      </p>

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
