"use client";

import { useState } from "react";
import Link from "next/link";
import type { ValuationAgencyConfig } from "@/lib/valuation/agency-config";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const PROPERTY_TYPES = ["Byt", "Dom", "Pozemok", "Objekt", "Ostatné"] as const;

type Props = {
  agency: ValuationAgencyConfig;
};

type FormState = {
  propertyType: (typeof PROPERTY_TYPES)[number];
  location: string;
  sqm: string;
  sellTimeline: string;
  name: string;
  phone: string;
  email: string;
  privacyAck: boolean;
  marketingOptIn: boolean;
};

const INITIAL: FormState = {
  propertyType: "Byt",
  location: "",
  sqm: "",
  sellTimeline: "",
  name: "",
  phone: "",
  email: "",
  privacyAck: false,
  marketingOptIn: false,
};

export function ValuationWidgetForm({ agency }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hp, setHp] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.privacyAck) {
      setError("Pred odoslaním potvrďte, že ste si prečítali informácie o ochrane údajov.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/valuation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencySlug: agency.slug,
          ...form,
          hp,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Nepodarilo sa odoslať. Skúste neskôr.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Nepodarilo sa odoslať. Skúste neskôr.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="mx-auto max-w-lg rounded-3xl p-8 text-center"
        style={{
          background: WORKDESK_CARD.background,
          border: `1px solid ${WORKDESK_CARD.borderColor}`,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: SLATE_HORIZON.brand }}>
          Ďakujeme
        </p>
        <h2 className="mt-3 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
          Váš dopyt sme prijali
        </h2>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
          Maklér z {agency.displayName} vás bude kontaktovať s orientačným odhadom.
          {agency.contactPromise ? ` ${agency.contactPromise}` : ""}
        </p>
        <p className="mt-4 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Online rozsah nie je znalecký posudok — presný odhad pripraví maklér po kontakte s vami.
        </p>
      </div>
    );
  }

  const inputStyle = {
    background: SLATE_HORIZON.cardBg,
    border: `1px solid ${SLATE_HORIZON.softBorder}`,
    color: SLATE_HORIZON.ink,
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-lg space-y-5 rounded-3xl p-6 sm:p-8"
      style={{
        background: WORKDESK_CARD.background,
        border: `1px solid ${WORKDESK_CARD.borderColor}`,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <input
        type="text"
        name="hp"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
          Druh nehnuteľnosti
        </label>
        <select
          value={form.propertyType}
          onChange={(e) => update("propertyType", e.target.value as FormState["propertyType"])}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={inputStyle}
          required
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
          Lokalita (mesto, ulica)
        </label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="napr. Prešov, Sekčov"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={inputStyle}
          required
          minLength={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            Výmera (m²)
          </label>
          <input
            type="number"
            value={form.sqm}
            onChange={(e) => update("sqm", e.target.value)}
            placeholder="75"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={inputStyle}
            required
            min={1}
            max={10000}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            Kedy plánujete predávať?
          </label>
          <select
            value={form.sellTimeline}
            onChange={(e) => update("sellTimeline", e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={inputStyle}
          >
            <option value="">Neviem / zatiaľ nie</option>
            <option value="do 3 mesiacov">Do 3 mesiacov</option>
            <option value="do 6 mesiacov">Do 6 mesiacov</option>
            <option value="do 12 mesiacov">Do 12 mesiacov</option>
            <option value="neskôr">Neskôr</option>
          </select>
        </div>
      </div>

      <hr style={{ borderColor: SLATE_HORIZON.softBorder }} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
          Meno a priezvisko
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={inputStyle}
          required
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            Telefón
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={inputStyle}
            required
            maxLength={50}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            E-mail
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={inputStyle}
            maxLength={254}
          />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        <input
          type="checkbox"
          checked={form.privacyAck}
          onChange={(e) => update("privacyAck", e.target.checked)}
          className="mt-1"
          required
        />
        <span>
          Beriem na vedomie{" "}
          <Link href={agency.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: SLATE_HORIZON.brand }}>
            informácie o ochrane osobných údajov
          </Link>{" "}
          spoločnosti {agency.displayName} (účel: orientačný odhad a kontakt maklérom).
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        <input
          type="checkbox"
          checked={form.marketingOptIn}
          onChange={(e) => update("marketingOptIn", e.target.checked)}
          className="mt-1"
        />
        <span>Chcem dostávať novinky a ponuky (nepovinné).</span>
      </label>

      {error && (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide transition-opacity disabled:opacity-60"
        style={{ background: SLATE_HORIZON.brand, color: "#fff" }}
      >
        {submitting ? "Odosielam…" : "Odoslať dopyt na odhad"}
      </button>

      <p className="text-center text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        Orientačný odhad nie je znalecký posudok. Presnú cenu pripraví maklér po kontakte s vami.
      </p>
    </form>
  );
}
